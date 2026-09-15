import { prisma } from '../database/prisma';
import { cpl, pct, toNum } from '../utils/calculations';
import { DONE_STATUSES, ACTIVE_STATUSES, REVIEW_STATUSES } from '../common/task-workflow';
import { dateOnly, rangeDates } from '../utils/date';
import { leadService } from './lead.service';
import { telecallingService } from './telecalling.service';

type Range = 'today' | 'week' | 'month';

export const dashboardService = {
  async adminOverview(range: Range = 'today') {
    const { start, end } = rangeDates(range);
    const today = new Date(dateOnly(new Date()));

    const [activeTasks, pendingReview, overdue, runningAds] = await Promise.all([
      prisma.task.count({ where: { status: { in: ACTIVE_STATUSES }, deletedAt: null } }),
      prisma.task.count({ where: { status: { in: REVIEW_STATUSES }, deletedAt: null } }),
      prisma.task.count({ where: { dueDate: { lt: today }, status: { notIn: DONE_STATUSES }, deletedAt: null } }),
      prisma.ad.count({ where: { status: 'RUNNING', deletedAt: null } }),
    ]);

    const [leads, conversions, revenueAgg, metricAgg] = await Promise.all([
      prisma.lead.count({ where: { createdAt: { gte: start, lte: end } } }),
      prisma.conversion.count({ where: { createdAt: { gte: start, lte: end } } }),
      prisma.transaction.aggregate({ _sum: { amount: true }, where: { paymentStatus: 'PAID', createdAt: { gte: start, lte: end } } }),
      prisma.adMetric.aggregate({ _sum: { spend: true, leads: true }, where: { statDate: { gte: new Date(dateOnly(start)), lte: new Date(dateOnly(end)) } } }),
    ]);

    const spend = toNum(metricAgg._sum.spend);
    const metricLeads = toNum(metricAgg._sum.leads);

    const [funnel, telecalling, needsAttention, recentActivity] = await Promise.all([
      leadService.funnel(),
      telecallingService.board(),
      this.needsAttention(),
      this.activityFeed(),
    ]);

    return {
      range,
      kpis: {
        activeTasks, pendingReview, overdue, runningAds,
        leads, conversions, revenue: toNum(revenueAgg._sum.amount), cpl: cpl(spend, metricLeads),
      },
      marketing: { spend, leads: metricLeads, cpl: cpl(spend, metricLeads) },
      funnel,
      telecalling,
      needsAttention,
      recentActivity,
    };
  },

  async businessFunnel(range: Range = 'month') {
    const { start, end } = rangeDates(range);
    const spendAgg = await prisma.adMetric.aggregate({
      _sum: { spend: true },
      where: { statDate: { gte: new Date(dateOnly(start)), lte: new Date(dateOnly(end)) } },
    });
    const spend = toNum(spendAgg._sum.spend);
    const f = await leadService.funnel();
    const revenueAgg = await prisma.transaction.aggregate({ _sum: { amount: true }, where: { paymentStatus: 'PAID' } });
    const revenue = toNum(revenueAgg._sum.amount);

    const stages = [
      { key: 'spend', label: 'Ad Spend', value: spend },
      { key: 'leads', label: 'Leads', value: f.generated },
      { key: 'contacted', label: 'Contacted', value: f.contacted },
      { key: 'interested', label: 'Interested', value: f.interested },
      { key: 'qualified', label: 'Qualified', value: f.qualified },
      { key: 'converted', label: 'Converted', value: f.converted },
      { key: 'revenue', label: 'Revenue', value: revenue },
    ];
    const steps = [
      { name: 'Lead → Contacted', rate: f.contactedRate, owner: 'Telecalling' },
      { name: 'Contacted → Interested', rate: f.interestedRate, owner: 'Lead quality / Telecalling' },
      { name: 'Interested → Qualified', rate: pct(f.qualified, f.interested), owner: 'Telecalling' },
      { name: 'Qualified → Converted', rate: pct(f.converted, f.qualified), owner: 'Conversion' },
    ];
    const weakest = steps.reduce((min, s) => (s.rate < min.rate ? s : min), steps[0]);

    return {
      cpl: cpl(spend, f.generated),
      stages, steps, weakestStage: weakest,
      insight: `${weakest.owner} stage requires attention (${weakest.name} is only ${weakest.rate}%).`,
    };
  },

  async needsAttention() {
    const items: { issue: string; severity: 'high' | 'medium' | 'low'; owner: string }[] = [];
    const today = new Date(dateOnly(new Date()));

    const overdue = await prisma.task.count({ where: { dueDate: { lt: today }, status: { notIn: DONE_STATUSES }, deletedAt: null } });
    if (overdue > 0) items.push({ issue: `${overdue} designer task(s) overdue — creative execution is delayed.`, severity: overdue > 3 ? 'high' : 'medium', owner: 'Designers' });

    const overdueFollowups = await prisma.followup.count({ where: { status: 'PENDING', followupDate: { lt: new Date() } } });
    if (overdueFollowups > 0) items.push({ issue: `${overdueFollowups} follow-up(s) overdue.`, severity: overdueFollowups > 15 ? 'high' : 'medium', owner: 'Telecalling' });

    const ni = await leadService.notInterested();
    const worst = ni.sort((a, b) => b.ratio - a.ratio)[0];
    if (worst && worst.ratio > 50) items.push({ issue: `High not-interested ratio (${worst.ratio}%) from ${worst.source} — lead quality needs attention.`, severity: 'high', owner: 'Marketing / Telecalling' });

    const pendingPayments = await prisma.transaction.count({ where: { paymentStatus: 'PENDING' } });
    if (pendingPayments > 0) items.push({ issue: `${pendingPayments} pending payment(s).`, severity: pendingPayments > 10 ? 'high' : 'low', owner: 'Conversion' });

    return items;
  },

  async activityFeed(limit = 15) {
    const rows = await prisma.auditLog.findMany({ orderBy: { createdAt: 'desc' }, take: limit });
    return rows.map((r) => ({ time: r.createdAt, action: r.action, entityType: r.entityType, entityId: r.entityId }));
  },

  /** Unified pending / attention-required work (counts + quick lists). */
  async pending() {
    const today = new Date(dateOnly(new Date()));
    const now = new Date();
    const [pendingTasks, pendingReviews, revisionRequired, overdueTasks, pendingFollowups, uncontactedLeads, paymentPending] =
      await Promise.all([
        prisma.task.count({ where: { status: { in: ACTIVE_STATUSES }, deletedAt: null } }),
        prisma.task.count({ where: { status: { in: REVIEW_STATUSES }, deletedAt: null } }),
        prisma.task.count({ where: { status: 'REVISION_REQUIRED', deletedAt: null } }),
        prisma.task.count({ where: { dueDate: { lt: today }, status: { notIn: DONE_STATUSES }, deletedAt: null } }),
        prisma.followup.count({ where: { status: 'PENDING', followupDate: { lt: now } } }),
        prisma.lead.count({ where: { status: { in: ['NEW', 'ASSIGNED'] }, deletedAt: null } }),
        prisma.transaction.count({ where: { paymentStatus: 'PENDING' } }),
      ]);
    const overdueList = await prisma.task.findMany({
      where: { dueDate: { lt: today }, status: { notIn: DONE_STATUSES }, deletedAt: null },
      orderBy: { dueDate: 'asc' }, take: 8,
      include: { assignee: { select: { name: true } }, campaign: { select: { name: true } } },
    });
    return {
      counts: { pendingTasks, pendingReviews, revisionRequired, overdueTasks, pendingFollowups, uncontactedLeads, paymentPending },
      overdueTasks: overdueList,
    };
  },

  /** Plain-language business health for non-technical managers. */
  async businessHealth() {
    const { start, end } = rangeDates('month');
    const funnel = await leadService.funnel();
    const metricAgg = await prisma.adMetric.aggregate({ _sum: { spend: true, leads: true }, where: { statDate: { gte: new Date(dateOnly(start)), lte: new Date(dateOnly(end)) } } });
    const spend = toNum(metricAgg._sum.spend);
    const metricLeads = toNum(metricAgg._sum.leads);
    const costPerLead = cpl(spend, metricLeads || funnel.generated);
    const target = 75; // CPL target (₹)
    const niWorst = (await leadService.notInterested()).sort((a, b) => b.ratio - a.ratio)[0];
    const overdueTasks = await prisma.task.count({ where: { dueDate: { lt: new Date(dateOnly(new Date())) }, status: { notIn: DONE_STATUSES }, deletedAt: null } });
    const overdueFollowups = await prisma.followup.count({ where: { status: 'PENDING', followupDate: { lt: new Date() } } });

    return [
      { area: 'Lead volume', status: funnel.generated > 0 ? 'Good' : 'Needs attention', ok: funnel.generated > 0, detail: `${funnel.generated} leads` },
      { area: 'Lead quality', status: (niWorst?.ratio ?? 0) > 50 ? 'Needs attention' : 'Good', ok: (niWorst?.ratio ?? 0) <= 50, detail: niWorst ? `Worst not-interested ${niWorst.ratio}% (${niWorst.source})` : 'No data' },
      { area: 'Cost per lead', status: costPerLead > target ? 'Above target' : 'On target', ok: costPerLead <= target, detail: `₹${costPerLead} vs target ₹${target}` },
      { area: 'Conversion', status: funnel.conversionRate < 3 ? 'Below target' : 'Good', ok: funnel.conversionRate >= 3, detail: `${funnel.conversionRate}% conversion` },
      { area: 'Designer workload', status: overdueTasks > 3 ? 'Needs attention' : 'Healthy', ok: overdueTasks <= 3, detail: `${overdueTasks} overdue task(s)` },
      { area: 'Telecalling follow-up', status: overdueFollowups > 10 ? 'Needs attention' : 'Healthy', ok: overdueFollowups <= 10, detail: `${overdueFollowups} follow-up(s) overdue` },
    ];
  },

  /** Today's operational activity — the daily control center. */
  async today() {
    const start = new Date(dateOnly(new Date()));
    const end = new Date();
    const [tasksCompleted, adsRunning, leads, calls, followupsPending, conversions, revenueAgg] = await Promise.all([
      prisma.task.count({ where: { completedAt: { gte: start, lte: end }, status: { in: DONE_STATUSES } } }),
      prisma.ad.count({ where: { status: 'RUNNING', deletedAt: null } }),
      prisma.lead.count({ where: { createdAt: { gte: start, lte: end } } }),
      prisma.callActivity.count({ where: { callDate: { gte: start, lte: end } } }),
      prisma.followup.count({ where: { status: 'PENDING' } }),
      prisma.conversion.count({ where: { createdAt: { gte: start, lte: end } } }),
      prisma.transaction.aggregate({ _sum: { amount: true }, where: { paymentStatus: 'PAID', createdAt: { gte: start, lte: end } } }),
    ]);
    return { tasksCompleted, adsRunning, leads, calls, followupsPending, conversions, revenue: toNum(revenueAgg._sum.amount) };
  },
};
