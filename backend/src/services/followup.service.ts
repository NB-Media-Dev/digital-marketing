import { Prisma } from '@prisma/client';
import { prisma } from '../database/prisma';
import { Forbidden, NotFound } from '../utils/response';
import { ActionContext } from '../types/context';
import { RoleCode } from '../common/rbac';
import { endOfDay, startOfDay } from '../utils/date';
import { socketService } from './socket.service';
import { EVENTS } from '../socket/events';

interface FollowupInput {
  leadId: string;
  followupDate: string;
  remarks?: string;
}

async function assertOwnsLead(leadId: string, ctx: ActionContext) {
  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead) throw NotFound('Lead not found.');
  if (ctx.user.roleCode === RoleCode.TELECALLER && lead.assignedTo !== ctx.user.id) {
    throw Forbidden('You can only work on leads assigned to you.');
  }
  return lead;
}

export const followupService = {
  async create(input: FollowupInput, ctx: ActionContext) {
    await assertOwnsLead(input.leadId, ctx);
    const f = await prisma.followup.create({
      data: { leadId: input.leadId, assignedTo: ctx.user.id, followupDate: new Date(input.followupDate), status: 'PENDING', remarks: input.remarks },
    });
    socketService.broadcast(EVENTS.followup.created, { leadId: input.leadId });
    return f;
  },

  list(ctx: ActionContext, bucket: 'today' | 'overdue' | 'upcoming' = 'today') {
    const start = startOfDay();
    const end = endOfDay();
    const where: Prisma.FollowupWhereInput = { status: 'PENDING' };
    if (ctx.user.roleCode === RoleCode.TELECALLER) where.assignedTo = ctx.user.id;
    if (bucket === 'today') where.followupDate = { gte: start, lte: end };
    else if (bucket === 'overdue') where.followupDate = { lt: start };
    else where.followupDate = { gt: end };
    return prisma.followup.findMany({ where, orderBy: { followupDate: 'asc' }, include: { lead: { select: { name: true, mobile: true } } } });
  },

  async complete(id: string, remarks: string | undefined, ctx: ActionContext) {
    const f = await prisma.followup.findUnique({ where: { id } });
    if (!f) throw NotFound('Follow-up not found.');
    if (ctx.user.roleCode === RoleCode.TELECALLER && f.assignedTo !== ctx.user.id) {
      throw Forbidden('You can only complete your own follow-ups.');
    }
    return prisma.followup.update({ where: { id }, data: { status: 'DONE', completedAt: new Date(), remarks: remarks ?? f.remarks } });
  },
};
