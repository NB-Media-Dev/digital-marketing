import { Task, TaskStatus } from '@prisma/client';
import { prisma } from '../database/prisma';
import { NotFound } from '../utils/response';
import { RoleCode } from '../common/rbac';
import { ACTIVE_STATUSES, DONE_STATUSES, REVIEW_STATUSES } from '../common/task-workflow';
import { completionRate, onTimeRate, pct, round } from '../utils/calculations';
import { dateOnly } from '../utils/date';

type Workload = 'Low' | 'Normal' | 'High' | 'Overloaded';
type Availability = 'Available' | 'Busy' | 'Overloaded' | 'Inactive';

async function counts(designerId: string) {
  const grouped = await prisma.task.groupBy({
    by: ['status'],
    where: { assignedTo: designerId, deletedAt: null },
    _count: { _all: true },
  });
  const by: Record<string, number> = {};
  let assigned = 0;
  for (const g of grouped) { by[g.status] = g._count._all; assigned += g._count._all; }

  const overdue = await prisma.task.count({
    where: {
      assignedTo: designerId, deletedAt: null,
      dueDate: { lt: new Date(dateOnly(new Date())) },
      status: { notIn: DONE_STATUSES },
    },
  });

  const sum = (keys: TaskStatus[]) => keys.reduce((a, k) => a + (by[k] ?? 0), 0);
  return {
    assigned,
    active: sum(ACTIVE_STATUSES),
    completed: sum(DONE_STATUSES),
    pendingReview: sum(REVIEW_STATUSES),
    overdue,
  };
}

function workload(active: number, overdue: number): Workload {
  if (active >= 9 || overdue >= 3) return 'Overloaded';
  if (active >= 6) return 'High';
  if (active <= 2) return 'Low';
  return 'Normal';
}

function availability(active: number, overdue: number, status: string): Availability {
  if (status !== 'ACTIVE') return 'Inactive';
  if (active >= 9 || overdue >= 3) return 'Overloaded';
  if (active >= 4) return 'Busy';
  return 'Available';
}

async function requireDesigner(id: string) {
  const d = await prisma.user.findUnique({ where: { id }, include: { role: true, team: true } });
  if (!d || d.role.code !== RoleCode.DESIGNER) throw NotFound('Designer not found.');
  return d;
}

export const designerService = {
  async list() {
    const designers = await prisma.user.findMany({
      where: { deletedAt: null, role: { code: RoleCode.DESIGNER } },
      include: { team: true },
    });
    return Promise.all(designers.map(async (d) => {
      const c = await counts(d.id);
      return {
        id: d.id, name: d.name, employeeCode: d.employeeCode, team: d.team?.name ?? '—',
        ...c,
        completionRate: completionRate(c.completed, c.assigned),
        workload: workload(c.active, c.overdue),
        status: availability(c.active, c.overdue, d.status),
      };
    }));
  },

  async workloadBoard() {
    const list = await this.list();
    return list.map((d) => ({ id: d.id, name: d.name, activeTasks: d.active, overdue: d.overdue, workload: d.workload }));
  },

  async performance(id: string) {
    const designer = await requireDesigner(id);
    const c = await counts(id);

    const completedTasks = await prisma.task.findMany({ where: { assignedTo: id, status: { in: DONE_STATUSES } } });
    const onTime = completedTasks.filter((t) =>
      t.completedAt && t.dueDate && new Date(t.completedAt) <= new Date(`${dateOnly(t.dueDate)}T23:59:59`),
    ).length;
    const revised = completedTasks.filter((t) => t.revisionCount > 0).length;
    const submittedTotal = completedTasks.length + c.pendingReview;

    const durations = completedTasks
      .filter((t) => t.acceptedAt && t.completedAt)
      .map((t) => (new Date(t.completedAt as Date).getTime() - new Date(t.acceptedAt as Date).getTime()) / 3.6e6);
    const avgHours = durations.length ? round(durations.reduce((a, b) => a + b, 0) / durations.length, 1) : 0;

    return {
      designer: { id: designer.id, name: designer.name, employeeCode: designer.employeeCode },
      ...c,
      completionRate: completionRate(c.completed, c.assigned),
      onTimeRate: onTimeRate(onTime, c.completed),
      revisionRate: pct(revised, submittedTotal || c.completed),
      avgCompletionHours: avgHours,
    };
  },

  async detail(id: string) {
    const perf = await this.performance(id);
    const [taskHistory, recentActivity, weeklyCompletion] = await Promise.all([
      prisma.task.findMany({ where: { assignedTo: id }, orderBy: { updatedAt: 'desc' }, take: 25, include: { campaign: { select: { name: true } } } }),
      prisma.taskTimeline.findMany({ where: { task: { assignedTo: id } }, orderBy: { createdAt: 'desc' }, take: 15 }),
      this.weeklyCompletion(id),
    ]);
    return {
      ...perf,
      currentAssignments: taskHistory.filter((t: Task) => ACTIVE_STATUSES.includes(t.status)),
      taskHistory,
      recentActivity,
      weeklyCompletion,
    };
  },

  async weeklyCompletion(id: string) {
    const rows = await prisma.$queryRawUnsafe<{ day: string; count: bigint }[]>(
      `SELECT DATE_FORMAT(completed_at, '%Y-%m-%d') AS day, COUNT(*) AS count
       FROM tasks WHERE assigned_to = ? AND completed_at IS NOT NULL
       AND completed_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
       GROUP BY day ORDER BY day ASC`, id,
    );
    return rows.map((r) => ({ day: r.day, count: Number(r.count) }));
  },

  tasksFor(id: string) {
    return prisma.task.findMany({ where: { assignedTo: id }, orderBy: { updatedAt: 'desc' }, include: { campaign: { select: { name: true } } } });
  },
};
