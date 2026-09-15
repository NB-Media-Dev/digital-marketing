import { prisma } from '../database/prisma';
import { NotFound } from '../utils/response';
import { ActionContext } from '../types/context';
import { code } from '../utils/code';
import { cpl, pct, toNum } from '../utils/calculations';
import { auditService } from './audit.service';

interface CampaignInput {
  name: string;
  objective?: string;
  status?: 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'COMPLETED';
  startDate?: string;
  endDate?: string;
  budget?: number;
  leadTarget?: number;
}

export const campaignService = {
  list() {
    return prisma.campaign.findMany({ where: { deletedAt: null }, orderBy: { createdAt: 'desc' } });
  },

  async create(input: CampaignInput, ctx: ActionContext) {
    const c = await prisma.campaign.create({
      data: {
        code: code('CMP'), name: input.name, objective: input.objective, status: input.status ?? 'DRAFT',
        startDate: input.startDate ? new Date(input.startDate) : null,
        endDate: input.endDate ? new Date(input.endDate) : null,
        budget: input.budget ?? 0, leadTarget: input.leadTarget ?? 0, createdBy: ctx.user.id,
      },
    });
    await auditService.record({ userId: ctx.user.id, action: 'CAMPAIGN_CREATED', entityType: 'campaign', entityId: c.id, newValue: { name: c.name }, ipAddress: ctx.ip });
    return c;
  },

  async update(id: string, input: Partial<CampaignInput>, ctx: ActionContext) {
    const existing = await prisma.campaign.findUnique({ where: { id } });
    if (!existing) throw NotFound('Campaign not found.');
    const c = await prisma.campaign.update({
      where: { id },
      data: {
        name: input.name, objective: input.objective, status: input.status,
        budget: input.budget, leadTarget: input.leadTarget,
        startDate: input.startDate ? new Date(input.startDate) : undefined,
        endDate: input.endDate ? new Date(input.endDate) : undefined,
      },
    });
    await auditService.record({ userId: ctx.user.id, action: 'CAMPAIGN_UPDATED', entityType: 'campaign', entityId: id, newValue: input, ipAddress: ctx.ip });
    return c;
  },

  /** Campaign performance: spend, leads, CPL, qualified, conversions, conversion rate. */
  async performance() {
    const campaigns = await this.list();
    return Promise.all(campaigns.map(async (c) => {
      const spendAgg = await prisma.adMetric.aggregate({ _sum: { spend: true }, where: { ad: { campaignId: c.id } } });
      const spend = toNum(spendAgg._sum.spend);

      const [leads, qualified, converted] = await Promise.all([
        prisma.lead.count({ where: { campaignId: c.id } }),
        prisma.lead.count({ where: { campaignId: c.id, status: 'QUALIFIED' } }),
        prisma.lead.count({ where: { campaignId: c.id, status: 'CONVERTED' } }),
      ]);

      return {
        id: c.id, code: c.code, name: c.name, status: c.status,
        spend, leads, cpl: cpl(spend, leads),
        qualified, conversions: converted,
        conversionRate: pct(converted, leads),
      };
    }));
  },
};
