import { prisma } from '../database/prisma';
import { cpl, toNum } from '../utils/calculations';
import { DONE_STATUSES, ACTIVE_STATUSES } from '../common/task-workflow';
import { dateOnly, endOfDay, startOfDay } from '../utils/date';

/**
 * Aggregate a GLOBAL daily-performance snapshot so reporting is fast.
 * Idempotent per date (upsert on [statDate, scope]).
 */
export async function dailyPerformanceJob(): Promise<void> {
  const start = startOfDay();
  const end = endOfDay();
  const statDate = new Date(dateOnly(start));

  const [metricAgg, leads, qualified, notInterested, callAgg, conversions, revenueAgg, tasksAssigned, tasksCompleted, tasksActive] =
    await Promise.all([
      prisma.adMetric.aggregate({ _sum: { spend: true, leads: true }, where: { statDate } }),
      prisma.lead.count({ where: { createdAt: { gte: start, lte: end } } }),
      prisma.lead.count({ where: { status: 'QUALIFIED' } }),
      prisma.lead.count({ where: { status: 'NOT_INTERESTED' } }),
      prisma.callActivity.groupBy({ by: ['outcome'], where: { callDate: { gte: start, lte: end } }, _count: { _all: true } }),
      prisma.conversion.count({ where: { createdAt: { gte: start, lte: end } } }),
      prisma.transaction.aggregate({ _sum: { amount: true }, where: { paymentStatus: 'PAID', createdAt: { gte: start, lte: end } } }),
      prisma.task.count({ where: { createdAt: { gte: start, lte: end } } }),
      prisma.task.count({ where: { completedAt: { gte: start, lte: end }, status: { in: DONE_STATUSES } } }),
      prisma.task.count({ where: { status: { in: ACTIVE_STATUSES }, deletedAt: null } }),
    ]);

  const callBy: Record<string, number> = {};
  let calls = 0;
  for (const g of callAgg) { callBy[g.outcome] = g._count._all; calls += g._count._all; }
  const spend = toNum(metricAgg._sum.spend);
  const metricLeads = toNum(metricAgg._sum.leads);

  await prisma.dailyPerformance.upsert({
    where: { statDate_scope: { statDate, scope: 'GLOBAL' } },
    update: {
      adSpend: spend, leads, cpl: cpl(spend, metricLeads), qualified, notInterested,
      calls, connected: callBy.CONNECTED ?? 0, interested: callBy.INTERESTED ?? 0,
      converted: callBy.CONVERTED ?? 0, conversions, revenue: toNum(revenueAgg._sum.amount),
      tasksAssigned, tasksCompleted, tasksPending: tasksActive, tasksOverdue: 0,
    },
    create: {
      statDate, scope: 'GLOBAL', adSpend: spend, leads, cpl: cpl(spend, metricLeads),
      qualified, notInterested, calls, connected: callBy.CONNECTED ?? 0, interested: callBy.INTERESTED ?? 0,
      converted: callBy.CONVERTED ?? 0, conversions, revenue: toNum(revenueAgg._sum.amount),
      tasksAssigned, tasksCompleted, tasksPending: tasksActive, tasksOverdue: 0,
    },
  });
  // eslint-disable-next-line no-console
  console.log(`[cron] daily-performance: aggregated ${dateOnly(start)}`);
}

/** Detect overdue tasks and log a count (extend to notify assignees as needed). */
export async function overdueTaskJob(): Promise<void> {
  const overdue = await prisma.task.count({
    where: { dueDate: { lt: new Date(dateOnly(new Date())) }, status: { notIn: DONE_STATUSES }, deletedAt: null },
  });
  // eslint-disable-next-line no-console
  console.log(`[cron] overdue-tasks: ${overdue} overdue`);
}

/** Detect follow-ups due now and log a count (extend to notify telecallers). */
export async function followupReminderJob(): Promise<void> {
  const due = await prisma.followup.count({ where: { status: 'PENDING', followupDate: { lte: new Date() } } });
  // eslint-disable-next-line no-console
  console.log(`[cron] followup-reminder: ${due} due`);
}
