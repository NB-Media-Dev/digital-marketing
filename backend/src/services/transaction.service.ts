import { prisma } from '../database/prisma';
import { NotFound } from '../utils/response';
import { ActionContext } from '../types/context';
import { code } from '../utils/code';
import { auditService } from './audit.service';
import { socketService } from './socket.service';
import { EVENTS } from '../socket/events';

export const transactionService = {
  list() {
    return prisma.transaction.findMany({ orderBy: { createdAt: 'desc' }, take: 200, include: { conversion: { select: { conversionCode: true } } } });
  },

  async create(input: { conversionId: string; amount: number; paymentMethod?: 'CASH' | 'CARD' | 'UPI' | 'BANK_TRANSFER' | 'OTHER'; paymentStatus?: 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED' }, ctx: ActionContext) {
    const conv = await prisma.conversion.findUnique({ where: { id: input.conversionId } });
    if (!conv) throw NotFound('Conversion not found.');
    const paid = input.paymentStatus === 'PAID';

    const txn = await prisma.$transaction(async (tx) => {
      const t = await tx.transaction.create({
        data: {
          transactionCode: code('TX'), conversionId: input.conversionId, leadId: conv.leadId, amount: input.amount,
          paymentMethod: input.paymentMethod ?? 'UPI', paymentStatus: input.paymentStatus ?? 'PENDING',
          paymentDate: paid ? new Date() : null,
        },
      });
      if (paid) await tx.conversion.update({ where: { id: conv.id }, data: { status: 'CONFIRMED' } });
      return t;
    });

    await auditService.record({ userId: ctx.user.id, action: 'TRANSACTION_CREATED', entityType: 'transaction', entityId: txn.id, newValue: { amount: input.amount, status: txn.paymentStatus }, ipAddress: ctx.ip });
    socketService.broadcast(EVENTS.transaction.created, { id: txn.id, status: txn.paymentStatus });
    return txn;
  },

  async updateStatus(id: string, paymentStatus: 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED', ctx: ActionContext) {
    const existing = await prisma.transaction.findUnique({ where: { id } });
    if (!existing) throw NotFound('Transaction not found.');
    const txn = await prisma.$transaction(async (tx) => {
      const t = await tx.transaction.update({
        where: { id },
        data: { paymentStatus, paymentDate: paymentStatus === 'PAID' && !existing.paymentDate ? new Date() : existing.paymentDate },
      });
      if (paymentStatus === 'PAID') await tx.conversion.update({ where: { id: existing.conversionId }, data: { status: 'CONFIRMED' } });
      return t;
    });
    await auditService.record({ userId: ctx.user.id, action: 'TRANSACTION_UPDATED', entityType: 'transaction', entityId: id, oldValue: { status: existing.paymentStatus }, newValue: { status: paymentStatus }, ipAddress: ctx.ip });
    return txn;
  },
};
