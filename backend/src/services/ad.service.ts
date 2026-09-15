import { prisma } from '../database/prisma';
import { NotFound } from '../utils/response';
import { ActionContext } from '../types/context';
import { code } from '../utils/code';
import { cpl, pct, toNum } from '../utils/calculations';
import { dateOnly } from '../utils/date';
import { auditService } from './audit.service';
import { socketService } from './socket.service';
import { EVENTS } from '../socket/events';
import { metaService } from './meta.service';

interface AdInput {
  campaignId: string;
  name: string;
  platform?: 'META' | 'FACEBOOK' | 'INSTAGRAM' | 'GOOGLE' | 'WEBSITE' | 'WHATSAPP' | 'MANUAL' | 'OTHER';
  status?: 'SCHEDULED' | 'RUNNING' | 'PAUSED' | 'COMPLETED';
  externalRef?: string;
  startDate?: string;
  budget?: number;
}

async function totals(adId: string) {
  const agg = await prisma.adMetric.aggregate({
    _sum: { spend: true, leads: true, clicks: true, impressions: true },
    where: { adId },
  });
  const spend = toNum(agg._sum.spend);
  const leads = toNum(agg._sum.leads);
  const clicks = toNum(agg._sum.clicks);
  const impressions = toNum(agg._sum.impressions);
  return { spend, leads, cpl: cpl(spend, leads), ctr: pct(clicks, impressions) };
}

export const adService = {
  async list() {
    const ads = await prisma.ad.findMany({ where: { deletedAt: null }, include: { campaign: { select: { name: true } } }, orderBy: { createdAt: 'desc' } });
    return Promise.all(ads.map(async (a) => ({ ...a, ...(await totals(a.id)) })));
  },

  async create(input: AdInput, ctx: ActionContext) {
    const campaign = await prisma.campaign.findUnique({ where: { id: input.campaignId } });
    if (!campaign) throw NotFound('Choose a valid campaign for this ad.');
    const a = await prisma.ad.create({
      data: {
        code: code('AD'), campaignId: input.campaignId, name: input.name,
        platform: input.platform ?? 'META', status: input.status ?? 'SCHEDULED',
        externalRef: input.externalRef ?? `mock_${code('EXT')}`,
        startDate: input.startDate ? new Date(input.startDate) : null,
        budget: input.budget ?? 0, createdBy: ctx.user.id,
      },
    });
    await auditService.record({ userId: ctx.user.id, action: 'AD_CREATED', entityType: 'ad', entityId: a.id, newValue: { name: a.name }, ipAddress: ctx.ip });
    return a;
  },

  async update(id: string, input: Partial<AdInput>, ctx: ActionContext) {
    const existing = await prisma.ad.findUnique({ where: { id } });
    if (!existing) throw NotFound('Ad not found.');
    const a = await prisma.ad.update({ where: { id }, data: { name: input.name, status: input.status, budget: input.budget } });
    await auditService.record({ userId: ctx.user.id, action: 'AD_UPDATED', entityType: 'ad', entityId: id, oldValue: { status: existing.status }, newValue: input, ipAddress: ctx.ip });
    return a;
  },

  /** Sync ad metrics from Meta (mock-aware). Idempotent per ad per day. */
  async sync(source: 'SCHEDULED' | 'MANUAL', userId?: string) {
    const startedAt = new Date();
    let status: 'SUCCESS' | 'PARTIAL' | 'FAILED' = 'SUCCESS';
    let adsSynced = 0;
    let message = '';

    try {
      const ads = await prisma.ad.findMany({ where: { deletedAt: null } });
      const insights = await metaService.fetchInsights(ads.map((a, i) => ({ externalRef: a.externalRef ?? a.id, seed: i + 1 })));
      const statDate = new Date(dateOnly(new Date()));

      for (const a of ads) {
        const ins = insights.find((x) => x.externalRef === (a.externalRef ?? a.id));
        if (!ins) continue;
        await prisma.adMetric.upsert({
          where: { adId_statDate: { adId: a.id, statDate } },
          update: { spend: ins.spend, impressions: ins.impressions, reach: ins.reach, clicks: ins.clicks, leads: ins.leads, conversions: ins.conversions, revenue: ins.revenue },
          create: { adId: a.id, statDate, spend: ins.spend, impressions: ins.impressions, reach: ins.reach, clicks: ins.clicks, leads: ins.leads, conversions: ins.conversions, revenue: ins.revenue },
        });
        adsSynced += 1;
      }
      message = metaService.isMock ? 'Synced with simulated Meta data (mock mode).' : 'Synced from Meta.';
      await metaService.markSynced();
    } catch {
      status = 'FAILED';
      message = 'Ad data could not be updated. Please try again.';
    }

    const log = await prisma.adSyncLog.create({
      data: { source, triggeredBy: userId ?? null, status, adsSynced, message, startedAt, finishedAt: new Date() },
    });
    socketService.broadcast(EVENTS.ad.syncCompleted, { status, adsSynced });
    return log;
  },

  syncLogs() {
    return prisma.adSyncLog.findMany({ orderBy: { startedAt: 'desc' }, take: 20 });
  },
};
