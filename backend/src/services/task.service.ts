import { Prisma, Task, TaskStatus } from '@prisma/client';
import { prisma } from '../database/prisma';
import { BadRequest, Forbidden, NotFound } from '../utils/response';
import { ActionContext } from '../types/context';
import { CreateTaskInput, TaskListFilters } from '../types/task.types';
import { RoleCode } from '../common/rbac';
import {
  ACTIVE_STATUSES, DONE_STATUSES, REVIEW_STATUSES,
  allowedNextStatuses, canTransition,
} from '../common/task-workflow';
import { PageParams, buildMeta } from '../utils/pagination';
import { code } from '../utils/code';
import { dateOnly } from '../utils/date';
import { auditService } from './audit.service';
import { notificationService } from './notification.service';
import { socketService } from './socket.service';
import { EVENTS } from '../socket/events';

const PRIVILEGED = [RoleCode.SUPER_ADMIN, RoleCode.ADMIN, RoleCode.DM_MANAGER];

function isPrivileged(ctx: ActionContext): boolean {
  return PRIVILEGED.includes(ctx.user.roleCode as RoleCode);
}

async function getOrFail(id: string): Promise<Task> {
  const task = await prisma.task.findFirst({ where: { id, deletedAt: null } });
  if (!task) throw NotFound('That task could not be found.');
  return task;
}

/** Designers may only touch tasks assigned to them. */
function assertAccess(task: Task, ctx: ActionContext): void {
  if (isPrivileged(ctx)) return;
  if (ctx.user.roleCode === RoleCode.DESIGNER && task.assignedTo === ctx.user.id) return;
  throw Forbidden('You can only access tasks assigned to you.');
}

function emit(event: string, task: Task): void {
  socketService.broadcast(event, { id: task.id, taskCode: task.taskCode, status: task.status });
  if (task.assignedTo) socketService.toUser(task.assignedTo, event, task);
  for (const r of PRIVILEGED) socketService.toRole(r, event, task);
}

interface TransitionOpts {
  remarks?: string;
  event: string;
  timeline: string;
}

/**
 * Perform a validated status transition inside a transaction: task update +
 * status history + timeline are one atomic operation. Audit / notification /
 * realtime run as side-effects afterwards.
 */
async function transition(task: Task, to: TaskStatus, ctx: ActionContext, opts: TransitionOpts): Promise<Task> {
  const from = task.status;
  if (!canTransition(from, to, ctx.user.roleCode as RoleCode)) {
    throw BadRequest(`This task can't move from "${from}" to "${to}" in its current state.`);
  }

  const now = new Date();
  const data: Prisma.TaskUpdateInput = { status: to };
  if (to === TaskStatus.ACCEPTED) data.acceptedAt = now;
  if (to === TaskStatus.IN_PROGRESS && !task.startedAt) data.startedAt = now;
  if (to === TaskStatus.SUBMITTED || to === TaskStatus.RESUBMITTED) data.submittedAt = now;
  if (to === TaskStatus.APPROVED) data.approvedAt = now;
  if (to === TaskStatus.COMPLETED) data.completedAt = now;

  const updated = await prisma.$transaction(async (tx) => {
    const t = await tx.task.update({ where: { id: task.id }, data });
    await tx.taskStatusHistory.create({
      data: { taskId: task.id, oldStatus: from, newStatus: to, changedBy: ctx.user.id, remarks: opts.remarks },
    });
    await tx.taskTimeline.create({
      data: { taskId: task.id, eventType: opts.event, description: opts.timeline, actorId: ctx.user.id },
    });
    return t;
  });

  await auditService.record({
    userId: ctx.user.id, action: `TASK_${opts.event.toUpperCase()}`,
    entityType: 'task', entityId: task.id,
    oldValue: { status: from }, newValue: { status: to }, ipAddress: ctx.ip, userAgent: ctx.ua,
  });
  emit(`task.${opts.event}`, updated);
  return updated;
}

export const taskService = {
  async create(input: CreateTaskInput, ctx: ActionContext): Promise<Task> {
    const task = await prisma.task.create({
      data: {
        taskCode: code('TSK'),
        title: input.title,
        description: input.description,
        requirements: input.requirements,
        campaignId: input.campaignId,
        priority: input.priority ?? 'MEDIUM',
        status: TaskStatus.DRAFT,
        progress: 0,
        createdBy: ctx.user.id,
        startDate: input.startDate ? new Date(input.startDate) : null,
        dueDate: input.dueDate ? new Date(input.dueDate) : null,
        estimatedHours: input.estimatedHours ?? null,
      },
    });
    await prisma.taskTimeline.create({ data: { taskId: task.id, eventType: 'created', description: 'Task created', actorId: ctx.user.id } });
    await auditService.record({ userId: ctx.user.id, action: 'TASK_CREATED', entityType: 'task', entityId: task.id, newValue: { title: task.title }, ipAddress: ctx.ip, userAgent: ctx.ua });
    emit(EVENTS.task.created, task);

    if (input.designerId) return this.assign(task.id, input.designerId, undefined, ctx);
    return task;
  },

  async update(id: string, input: Partial<CreateTaskInput>, ctx: ActionContext): Promise<Task> {
    await getOrFail(id);
    if (!isPrivileged(ctx)) throw Forbidden('You are not allowed to edit this task.');
    const task = await prisma.task.update({
      where: { id },
      data: {
        title: input.title,
        description: input.description,
        requirements: input.requirements,
        priority: input.priority,
        dueDate: input.dueDate ? new Date(input.dueDate) : undefined,
        estimatedHours: input.estimatedHours,
      },
    });
    await auditService.record({ userId: ctx.user.id, action: 'TASK_UPDATED', entityType: 'task', entityId: id, newValue: input, ipAddress: ctx.ip, userAgent: ctx.ua });
    return task;
  },

  async assign(id: string, designerId: string, reason: string | undefined, ctx: ActionContext, isReassign = false): Promise<Task> {
    const task = await getOrFail(id);
    const designer = await prisma.user.findUnique({ where: { id: designerId }, include: { role: true } });
    if (!designer || designer.role.code !== RoleCode.DESIGNER) throw BadRequest('Please choose a valid designer.');

    const prev = task.assignedTo;
    const nextStatus = task.status === TaskStatus.DRAFT ? TaskStatus.ASSIGNED : task.status;

    const updated = await prisma.$transaction(async (tx) => {
      await tx.taskAssignment.updateMany({ where: { taskId: id, isCurrent: true }, data: { isCurrent: false, unassignedAt: new Date() } });
      await tx.taskAssignment.create({ data: { taskId: id, designerId, assignedBy: ctx.user.id, reason, isCurrent: true } });
      const t = await tx.task.update({ where: { id }, data: { assignedTo: designerId, assignedBy: ctx.user.id, status: nextStatus } });
      const action = isReassign ? 'reassigned' : 'assigned';
      await tx.taskStatusHistory.create({ data: { taskId: id, oldStatus: task.status, newStatus: nextStatus, changedBy: ctx.user.id, remarks: reason } });
      await tx.taskTimeline.create({ data: { taskId: id, eventType: action, description: `Task ${action} to ${designer.name} by ${ctx.user.name}`, actorId: ctx.user.id } });
      return t;
    });

    const action = isReassign ? 'reassigned' : 'assigned';
    await auditService.record({ userId: ctx.user.id, action: `TASK_${action.toUpperCase()}`, entityType: 'task', entityId: id, oldValue: { assignedTo: prev }, newValue: { assignedTo: designerId }, ipAddress: ctx.ip, userAgent: ctx.ua });
    await notificationService.notify({ userId: designerId, type: 'TASK_ASSIGNED', title: 'New task assigned', message: `${task.title} was assigned to you.`, entityType: 'task', entityId: id });
    emit(`task.${action}`, updated);
    return updated;
  },

  reassign(id: string, designerId: string, reason: string | undefined, ctx: ActionContext) {
    return this.assign(id, designerId, reason, ctx, true);
  },

  async accept(id: string, ctx: ActionContext) {
    const task = await getOrFail(id);
    assertAccess(task, ctx);
    return transition(task, TaskStatus.ACCEPTED, ctx, { event: 'accepted', timeline: 'Task accepted by designer' });
  },

  async start(id: string, ctx: ActionContext) {
    const task = await getOrFail(id);
    assertAccess(task, ctx);
    return transition(task, TaskStatus.IN_PROGRESS, ctx, { event: 'started', timeline: 'Work started' });
  },

  async updateProgress(id: string, progress: number, remarks: string | undefined, ctx: ActionContext): Promise<Task> {
    const task = await getOrFail(id);
    assertAccess(task, ctx);
    const progressable: TaskStatus[] = [TaskStatus.ACCEPTED, TaskStatus.IN_PROGRESS, TaskStatus.REVISION_REQUIRED];
    if (!progressable.includes(task.status)) {
      throw BadRequest('Progress can only be updated while the task is in progress.');
    }
    const old = task.progress;
    const nextStatus = task.status === TaskStatus.ACCEPTED ? TaskStatus.IN_PROGRESS : task.status;

    const updated = await prisma.$transaction(async (tx) => {
      await tx.taskProgressHistory.create({ data: { taskId: id, oldProgress: old, newProgress: progress, updatedBy: ctx.user.id, remarks } });
      const t = await tx.task.update({ where: { id }, data: { progress, status: nextStatus, startedAt: task.startedAt ?? new Date() } });
      await tx.taskTimeline.create({ data: { taskId: id, eventType: 'progress', description: `Progress ${old}% → ${progress}%`, actorId: ctx.user.id } });
      return t;
    });

    await auditService.record({ userId: ctx.user.id, action: 'TASK_PROGRESS_UPDATED', entityType: 'task', entityId: id, oldValue: { progress: old }, newValue: { progress }, ipAddress: ctx.ip, userAgent: ctx.ua });
    emit(EVENTS.task.progressUpdated, updated);
    return updated;
  },

  async submit(id: string, file: { fileName: string; fileUrl: string; fileType?: string; fileSize?: number; remarks?: string }, ctx: ActionContext): Promise<Task> {
    const task = await getOrFail(id);
    assertAccess(task, ctx);
    const resubmit = task.status === TaskStatus.REVISION_REQUIRED;
    const target = resubmit ? TaskStatus.RESUBMITTED : TaskStatus.SUBMITTED;
    const versionNumber = (await prisma.taskVersion.count({ where: { taskId: id } })) + 1;

    await prisma.$transaction(async (tx) => {
      await tx.taskVersion.create({
        data: {
          taskId: id, versionNumber, fileName: file.fileName, fileUrl: file.fileUrl,
          fileType: file.fileType, fileSize: file.fileSize ? BigInt(file.fileSize) : null,
          uploadedBy: ctx.user.id, remarks: file.remarks, status: 'SUBMITTED',
        },
      });
      await tx.taskTimeline.create({ data: { taskId: id, eventType: 'version', description: `V${versionNumber} uploaded`, actorId: ctx.user.id } });
      if (task.progress < 100) await tx.task.update({ where: { id }, data: { progress: 100 } });
    });

    return transition({ ...task, progress: 100 }, target, ctx, {
      remarks: file.remarks, event: 'submitted',
      timeline: `Design ${resubmit ? 'resubmitted' : 'submitted'} (V${versionNumber})`,
    });
  },

  async review(id: string, ctx: ActionContext) {
    const task = await getOrFail(id);
    return transition(task, TaskStatus.UNDER_REVIEW, ctx, { event: 'review', timeline: 'Task moved to review' });
  },

  async requestRevision(id: string, reason: string, ctx: ActionContext): Promise<Task> {
    let task = await getOrFail(id);
    if (task.status === TaskStatus.SUBMITTED || task.status === TaskStatus.RESUBMITTED) {
      task = await transition(task, TaskStatus.UNDER_REVIEW, ctx, { event: 'review', timeline: 'Task moved to review' });
    }
    await prisma.task.update({ where: { id }, data: { revisionCount: { increment: 1 } } });
    const latest = await prisma.taskVersion.findFirst({ where: { taskId: id }, orderBy: { versionNumber: 'desc' } });
    if (latest) await prisma.taskVersion.update({ where: { id: latest.id }, data: { status: 'REVISION_REQUIRED' } });
    if (task.assignedTo) {
      await notificationService.notify({ userId: task.assignedTo, type: 'TASK_REVISION', title: 'Revision requested', message: reason, entityType: 'task', entityId: id });
    }
    return transition(task, TaskStatus.REVISION_REQUIRED, ctx, { remarks: reason, event: 'revision_requested', timeline: `Revision requested: ${reason}` });
  },

  async approve(id: string, ctx: ActionContext): Promise<Task> {
    let task = await getOrFail(id);
    if (ctx.user.roleCode === RoleCode.DESIGNER) throw Forbidden('Designers cannot approve tasks.');
    if (task.status === TaskStatus.SUBMITTED || task.status === TaskStatus.RESUBMITTED) {
      task = await transition(task, TaskStatus.UNDER_REVIEW, ctx, { event: 'review', timeline: 'Task moved to review' });
    }
    const latest = await prisma.taskVersion.findFirst({ where: { taskId: id }, orderBy: { versionNumber: 'desc' } });
    if (latest) await prisma.taskVersion.update({ where: { id: latest.id }, data: { status: 'APPROVED' } });
    if (task.assignedTo) {
      await notificationService.notify({ userId: task.assignedTo, type: 'TASK_APPROVED', title: 'Task approved', message: `${task.title} was approved.`, entityType: 'task', entityId: id });
    }
    return transition(task, TaskStatus.APPROVED, ctx, { event: 'approved', timeline: 'Design approved' });
  },

  async publish(id: string, ctx: ActionContext) {
    const task = await getOrFail(id);
    return transition(task, TaskStatus.PUBLISHED, ctx, { event: 'published', timeline: 'Creative published to ad' });
  },

  async complete(id: string, ctx: ActionContext) {
    const task = await getOrFail(id);
    return transition(task, TaskStatus.COMPLETED, ctx, { event: 'completed', timeline: 'Task completed' });
  },

  async addComment(id: string, message: string, ctx: ActionContext) {
    const task = await getOrFail(id);
    assertAccess(task, ctx);
    const comment = await prisma.taskComment.create({ data: { taskId: id, userId: ctx.user.id, message }, include: { user: { select: { name: true } } } });
    await prisma.taskTimeline.create({ data: { taskId: id, eventType: 'comment', description: `${ctx.user.name} commented`, actorId: ctx.user.id } });
    socketService.broadcast(EVENTS.task.comment, { taskId: id });
    return comment;
  },

  async list(ctx: ActionContext, filters: TaskListFilters, params: PageParams) {
    const where: Prisma.TaskWhereInput = { deletedAt: null };
    if (ctx.user.roleCode === RoleCode.DESIGNER) where.assignedTo = ctx.user.id;
    else if (filters.designerId) where.assignedTo = filters.designerId;
    if (filters.status) where.status = filters.status;
    if (filters.priority) where.priority = filters.priority;
    if (filters.campaignId) where.campaignId = filters.campaignId;

    const today = new Date(dateOnly(new Date()));
    if (filters.bucket === 'active') where.status = { in: ACTIVE_STATUSES };
    else if (filters.bucket === 'pending_review') where.status = { in: REVIEW_STATUSES };
    else if (filters.bucket === 'overdue') { where.dueDate = { lt: today }; where.status = { notIn: DONE_STATUSES }; }
    else if (filters.bucket === 'completed') where.status = { in: DONE_STATUSES };

    if (params.search) {
      where.OR = [
        { title: { contains: params.search } },
        { taskCode: { contains: params.search } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.task.findMany({
        where,
        include: { assignee: { select: { id: true, name: true } }, campaign: { select: { id: true, name: true } } },
        orderBy: { updatedAt: 'desc' },
        skip: params.skip, take: params.take,
      }),
      prisma.task.count({ where }),
    ]);
    return { items, meta: buildMeta(total, params) };
  },

  async detail(id: string, ctx: ActionContext) {
    const task = await prisma.task.findFirst({
      where: { id, deletedAt: null },
      include: { assignee: { select: { id: true, name: true } }, campaign: { select: { id: true, name: true } } },
    });
    if (!task) throw NotFound('That task could not be found.');
    assertAccess(task, ctx);

    const [versions, statusHistory, progressHistory, comments, timeline, assignments] = await Promise.all([
      prisma.taskVersion.findMany({ where: { taskId: id }, orderBy: { versionNumber: 'desc' } }),
      prisma.taskStatusHistory.findMany({ where: { taskId: id }, orderBy: { createdAt: 'desc' } }),
      prisma.taskProgressHistory.findMany({ where: { taskId: id }, orderBy: { createdAt: 'desc' } }),
      prisma.taskComment.findMany({ where: { taskId: id }, include: { user: { select: { name: true } } }, orderBy: { createdAt: 'asc' } }),
      prisma.taskTimeline.findMany({ where: { taskId: id }, orderBy: { createdAt: 'asc' } }),
      prisma.taskAssignment.findMany({ where: { taskId: id }, orderBy: { assignedAt: 'desc' } }),
    ]);

    return {
      task,
      allowedNext: allowedNextStatuses(task.status, ctx.user.roleCode as RoleCode),
      versions, statusHistory, progressHistory, comments, timeline, assignments,
    };
  },

  history(id: string) {
    return prisma.taskTimeline.findMany({ where: { taskId: id }, orderBy: { createdAt: 'asc' } });
  },
  versions(id: string) {
    return prisma.taskVersion.findMany({ where: { taskId: id }, orderBy: { versionNumber: 'desc' } });
  },
};
