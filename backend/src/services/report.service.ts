import { prisma } from '../database/prisma';
import { cpl, pct, toNum } from '../utils/calculations';
import { campaignService } from './campaign.service';
import { telecallingService } from './telecalling.service';
import { leadService } from './lead.service';
import { designerService } from './designer.service';

/** Named reports resolve to flat row sets suitable for display and CSV export. */
export const reportService = {
  async rows(type: string): Promise<Record<string, unknown>[]> {
    switch (type) {
      case 'campaign-performance':
      case 'marketing':
        return campaignService.performance();
      case 'telecaller-performance':
      case 'telecalling':
        return telecallingService.board();
      case 'not-interested':
        return leadService.notInterested();
      case 'lead-sources':
      case 'leads':
        return leadService.sourcePerformance();
      case 'designers':
        return designerService.list() as unknown as Promise<Record<string, unknown>[]>;
      case 'conversions':
        return this.conversionsReport();
      case 'business':
        return [await this.businessReport()];
      default:
        return [];
    }
  },

  async conversionsReport() {
    const rows = await prisma.conversion.findMany({ include: { lead: { select: { name: true } } }, orderBy: { createdAt: 'desc' }, take: 500 });
    return rows.map((c) => ({
      conversionCode: c.conversionCode, lead: c.lead.name, amount: toNum(c.amount), status: c.status,
      conversionDate: c.conversionDate.toISOString().slice(0, 10),
    }));
  },

  /** Overall business funnel snapshot (spend → revenue). */
  async businessReport() {
    const spendAgg = await prisma.adMetric.aggregate({ _sum: { spend: true } });
    const spend = toNum(spendAgg._sum.spend);
    const funnel = await leadService.funnel();
    const revenueAgg = await prisma.transaction.aggregate({ _sum: { amount: true }, where: { paymentStatus: 'PAID' } });
    const revenue = toNum(revenueAgg._sum.amount);
    return {
      spend, leads: funnel.generated, cpl: cpl(spend, funnel.generated),
      contacted: funnel.contacted, interested: funnel.interested,
      qualified: funnel.qualified, converted: funnel.converted,
      qualifiedRate: funnel.qualifiedRate, conversionRate: funnel.conversionRate,
      revenue, roas: pct(revenue, spend),
    };
  },
};
