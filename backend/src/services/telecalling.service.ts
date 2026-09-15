import { CallOutcome, LeadStatus, Prisma } from '@prisma/client';
import { prisma } from '../database/prisma';
import { Forbidden, NotFound } from '../utils/response';
import { ActionContext } from '../types/context';
import { RoleCode } from '../common/rbac';
import { pct } from '../utils/calculations';
import { endOfDay, startOfDay } from '../utils/date';
import { auditService } from './audit.service';
import { socketService } from './socket.service';
import { EVENTS } from '../socket/events';
import { followupService } from './followup.service';

const OUTCOME_TO_STATUS: Partial<Record<CallOutcome, LeadStatus>> = {
  CONNECTED: 'CONTACTED',
  INTERESTED: 'INTERESTED',
  NOT_INTERESTED: 'NOT_INTERESTED',
  CALL_BACK: 'FOLLOW_UP',
  QUALIFIED: 'QUALIFIED',
  CONVERTED: 'CONVERTED',
  LOST: 'LOST',
};

async function assertOwnsLead(leadId: string, ctx: ActionContext) {
  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead) throw NotFound('Lead not found.');
  if (ctx.user.roleCode === RoleCode.TELECALLER && lead.assignedTo !== ctx.user.id) {
    throw Forbidden('You can only work on leads assigned to you.');
  }
  return lead;
}

interface LogCallInput {
  leadId: string;
  outcome: CallOutcome;
  duration?: number;
  remarks?: string;
  nextFollowup?: string;
}

export const telecallingService = {
  async logCall(input: LogCallInput, ctx: ActionContext) {
    const lead = await assertOwnsLead(input.leadId, ctx);
    const nextFollowup = input.nextFollowup ? new Date(input.nextFollowup) : null;

    const call = await prisma.$transaction(async (tx) => {
      const c = await tx.callActivity.create({
        data: { leadId: input.leadId, telecallerId: ctx.user.id, callDate: new Date(), duration: input.duration ?? 0, outcome: input.outcome, remarks: input.remarks, nextFollowup },
      });
      const newStatus = OUTCOME_TO_STATUS[input.outcome];
      if (newStatus && lead.status !== newStatus) {
        await tx.lead.update({ where: { id: lead.id }, data: { status: newStatus } });
        await tx.leadStatusHistory.create({ data: { leadId: lead.id, oldStatus: lead.status, newStatus, changedBy: ctx.user.id, remarks: input.remarks } });
      }
      if (nextFollowup) {
        await tx.followup.create({ data: { leadId: input.leadId, assignedTo: ctx.user.id, followupDate: nextFollowup, status: 'PENDING', remarks: input.remarks } });
      }
      return c;
    });

    await auditService.record({ userId: ctx.user.id, action: 'CALL_CREATED', entityType: 'lead', entityId: input.leadId, newValue: { outcome: input.outcome }, ipAddress: ctx.ip });
    socketService.broadcast(EVENTS.call.created, { leadId: input.leadId, outcome: input.outcome });
    const mapped = OUTCOME_TO_STATUS[input.outcome];
    if (mapped) socketService.broadcast(EVENTS.lead.statusChanged, { id: input.leadId, status: mapped });
    return call;
  },

  listCalls(ctx: ActionContext, leadId?: string) {
    const where: Prisma.CallActivityWhereInput = {};
    if (ctx.user.roleCode === RoleCode.TELECALLER) where.telecallerId = ctx.user.id;
    if (leadId) where.leadId = leadId;
    return prisma.callActivity.findMany({ where, orderBy: { callDate: 'desc' }, take: 200, include: { lead: { select: { name: true } } } });
  },

  async myDashboard(ctx: ActionContext) {
    const start = startOfDay();
    const end = endOfDay();
    const assigned = await prisma.lead.count({ where: { assignedTo: ctx.user.id } });
    const grouped = await prisma.callActivity.groupBy({
      by: ['outcome'],
      where: { telecallerId: ctx.user.id, callDate: { gte: start, lte: end } },
      _count: { _all: true },
    });
    const by: Record<string, number> = {};
    let calls = 0;
    for (const g of grouped) { by[g.outcome] = g._count._all; calls += g._count._all; }
    const followupsToday = await followupService.list(ctx, 'today');
    return {
      assigned, calls,
      connected: (by.CONNECTED ?? 0) + (by.INTERESTED ?? 0) + (by.NOT_INTERESTED ?? 0) + (by.QUALIFIED ?? 0),
      interested: by.INTERESTED ?? 0,
      notInterested: by.NOT_INTERESTED ?? 0,
      qualified: by.QUALIFIED ?? 0,
      converted: by.CONVERTED ?? 0,
      followupsToday,
    };
  },

  async board() {
    const telecallers = await prisma.user.findMany({ where: { role: { code: RoleCode.TELECALLER } } });
    return Promise.all(telecallers.map(async (t) => {
      const assigned = await prisma.lead.count({ where: { assignedTo: t.id } });
      const grouped = await prisma.callActivity.groupBy({ by: ['outcome'], where: { telecallerId: t.id }, _count: { _all: true } });
      const by: Record<string, number> = {};
      let calls = 0;
      for (const g of grouped) { by[g.outcome] = g._count._all; calls += g._count._all; }
      const followups = await prisma.followup.count({ where: { assignedTo: t.id, status: 'PENDING' } });
      const interested = by.INTERESTED ?? 0;
      const notInterested = by.NOT_INTERESTED ?? 0;
      const qualified = by.QUALIFIED ?? 0;
      const conversions = by.CONVERTED ?? 0;
      return {
        id: t.id, name: t.name, employeeCode: t.employeeCode,
        assigned, calls, interested, notInterested, followups, qualified, conversions,
        conversionRate: pct(conversions, assigned),
        notInterestedRatio: pct(notInterested, calls),
      };
    }));
  },
};
