import { prisma } from '../database/prisma';
import { NotFound } from '../utils/response';
import { ActionContext } from '../types/context';
import { code } from '../utils/code';
import { pct, toNum } from '../utils/calculations';
import { auditService } from './audit.service';
import { socketService } from './socket.service';
import { EVENTS } from '../socket/events';

export const conversionService = {
  list() {
    return prisma.conversion.findMany({ orderBy: { createdAt: 'desc' }, take: 200, include: { lead: { select: { name: true } } } });
  },

  async create(input: { leadId: string; amount: number; remarks?: string }, ctx: ActionContext) {
    const lead = await prisma.lead.findUnique({ where: { id: input.leadId } });
    if (!lead) throw NotFound('Lead not found.');

    const conv = await prisma.$transaction(async (tx) => {
      const c = await tx.conversion.create({
        data: { conversionCode: code('CN'), leadId: input.leadId, convertedBy: ctx.user.id, conversionDate: new Date(), amount: input.amount, status: 'PENDING', remarks: input.remarks },
      });
      if (lead.status !== 'CONVERTED') {
        await tx.lead.update({ where: { id: lead.id }, data: { status: 'CONVERTED' } });
        await tx.leadStatusHistory.create({ data: { leadId: lead.id, oldStatus: lead.status, newStatus: 'CONVERTED', changedBy: ctx.user.id } });
      }
      return c;
    });

    await auditService.record({ userId: ctx.user.id, action: 'CONVERSION_CREATED', entityType: 'conversion', entityId: conv.id, newValue: { amount: input.amount }, ipAddress: ctx.ip });
    socketService.broadcast(EVENTS.conversion.created, { id: conv.id, amount: input.amount });
    return conv;
  },

  async update(id: string, input: { status?: 'PENDING' | 'CONFIRMED' | 'CANCELLED'; amount?: number }, ctx: ActionContext) {
    const existing = await prisma.conversion.findUnique({ where: { id } });
    if (!existing) throw NotFound('Conversion not found.');
    const c = await prisma.conversion.update({ where: { id }, data: { status: input.status, amount: input.amount } });
    await auditService.record({ userId: ctx.user.id, action: 'CONVERSION_UPDATED', entityType: 'conversion', entityId: id, newValue: input, ipAddress: ctx.ip });
    return c;
  },

  /** Conversion dashboard: qualified, conversions, rate, pending payments, revenue. */
  async dashboard() {
    const [qualifiedLeads, totalLeads, conversions, pendingPayments, revenueAgg, recentConversions, pendingTransactions] = await Promise.all([
      prisma.lead.count({ where: { status: 'QUALIFIED' } }),
      prisma.lead.count(),
      prisma.conversion.count(),
      prisma.transaction.count({ where: { paymentStatus: 'PENDING' } }),
      prisma.transaction.aggregate({ _sum: { amount: true }, where: { paymentStatus: 'PAID' } }),
      prisma.conversion.findMany({ orderBy: { createdAt: 'desc' }, take: 8, include: { lead: { select: { name: true } } } }),
      prisma.transaction.findMany({ where: { paymentStatus: 'PENDING' }, orderBy: { createdAt: 'desc' }, take: 8 }),
    ]);
    return {
      qualifiedLeads,
      conversions,
      conversionRate: pct(conversions, totalLeads),
      qualifiedConversionRate: pct(conversions, qualifiedLeads + conversions),
      pendingPayments,
      revenue: toNum(revenueAgg._sum.amount),
      recentConversions,
      pendingTransactions,
    };
  },
};
