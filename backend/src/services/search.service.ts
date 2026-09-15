import { prisma } from '../database/prisma';
import { ActionContext } from '../types/context';
import { RoleCode } from '../common/rbac';

/**
 * Global search across the main business entities, grouped for the top-bar
 * results dropdown. Respects role scoping (designers → own tasks, telecallers
 * → own leads). Each group is capped for a fast, scannable result.
 */
export const searchService = {
  async search(q: string, ctx: ActionContext) {
    const query = q.trim();
    if (query.length < 2) return { tasks: [], leads: [], campaigns: [], users: [], transactions: [] };
    const take = 5;
    const canUsers = ctx.user.permissions.includes('users.view');
    const canTxns = ctx.user.permissions.includes('transactions.view');

    const taskWhere: Record<string, unknown> = {
      deletedAt: null,
      OR: [{ title: { contains: query } }, { taskCode: { contains: query } }],
    };
    if (ctx.user.roleCode === RoleCode.DESIGNER) taskWhere.assignedTo = ctx.user.id;

    const leadWhere: Record<string, unknown> = {
      deletedAt: null,
      OR: [{ name: { contains: query } }, { mobile: { contains: query } }, { email: { contains: query } }, { leadCode: { contains: query } }],
    };
    if (ctx.user.roleCode === RoleCode.TELECALLER) leadWhere.assignedTo = ctx.user.id;

    const [tasks, leads, campaigns, users, transactions] = await Promise.all([
      prisma.task.findMany({ where: taskWhere, take, orderBy: { updatedAt: 'desc' }, select: { id: true, taskCode: true, title: true, status: true } }),
      prisma.lead.findMany({ where: leadWhere, take, orderBy: { createdAt: 'desc' }, select: { id: true, leadCode: true, name: true, mobile: true, status: true } }),
      prisma.campaign.findMany({ where: { deletedAt: null, OR: [{ name: { contains: query } }, { code: { contains: query } }] }, take, select: { id: true, code: true, name: true, status: true } }),
      canUsers
        ? prisma.user.findMany({ where: { deletedAt: null, OR: [{ name: { contains: query } }, { email: { contains: query } }, { employeeCode: { contains: query } }] }, take, select: { id: true, name: true, email: true, employeeCode: true } })
        : Promise.resolve([]),
      canTxns
        ? prisma.transaction.findMany({ where: { transactionCode: { contains: query } }, take, select: { id: true, transactionCode: true, amount: true, paymentStatus: true } })
        : Promise.resolve([]),
    ]);

    return { tasks, leads, campaigns, users, transactions };
  },
};
