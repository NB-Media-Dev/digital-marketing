import { MetaConnection } from '@prisma/client';
import { prisma } from '../database/prisma';
import { env } from '../config/env';
import { toNum } from '../utils/calculations';
import { BadRequest } from '../utils/response';

export interface MetaInsight {
  externalRef: string;
  spend: number;
  impressions: number;
  reach: number;
  clicks: number;
  leads: number;
  conversions: number;
  revenue: number;
}

const GRAPH = `https://graph.facebook.com/${env.meta.apiVersion}`;

/** Fields never returned to the frontend. */
function publicConnection(c: MetaConnection) {
  const { accessToken: _t, ...rest } = c;
  void _t;
  return rest;
}

async function getOrCreate(): Promise<MetaConnection> {
  return prisma.metaConnection.upsert({
    where: { provider: 'meta' },
    update: {},
    create: { provider: 'meta', status: 'NOT_CONNECTED' },
  });
}

/**
 * Meta Ads integration layer. All Graph API access funnels through here so the
 * rest of the app never talks to Meta directly and app secrets never reach the
 * frontend. When app credentials are absent (env.meta.mock) a demo connection
 * and synthetic insights keep the app fully usable for development.
 */
export const metaService = {
  get isMock(): boolean {
    return env.meta.mock;
  },

  /** Connection status + live counts derived from the database. */
  async status() {
    const c = await getOrCreate();
    const [campaigns, ads, spendAgg, leadsAgg] = await Promise.all([
      prisma.campaign.count({ where: { deletedAt: null } }),
      prisma.ad.count({ where: { deletedAt: null } }),
      prisma.adMetric.aggregate({ _sum: { spend: true } }),
      prisma.adMetric.aggregate({ _sum: { leads: true } }),
    ]);
    return {
      ...publicConnection(c),
      mockMode: this.isMock,
      appConfigured: !this.isMock,
      counts: { campaigns, ads, spend: toNum(spendAgg._sum.spend), leads: toNum(leadsAgg._sum.leads) },
    };
  },

  /** Build the Meta OAuth dialog URL (real mode). */
  authUrl(state: string): string {
    if (this.isMock) throw BadRequest('Meta app credentials are not configured. Use "Connect (demo)" or set META_APP_ID / META_APP_SECRET.');
    const params = new URLSearchParams({
      client_id: env.meta.appId,
      redirect_uri: env.meta.redirectUri,
      state,
      scope: env.meta.scopes,
      response_type: 'code',
    });
    return `https://www.facebook.com/${env.meta.apiVersion}/dialog/oauth?${params.toString()}`;
  },

  /** Exchange an OAuth code for a token and store the connection. */
  async handleCallback(code: string, userId?: string) {
    if (this.isMock) return this.connectDemo(userId);
    // 1. code → short-lived token
    const tokenUrl = `${GRAPH}/oauth/access_token?` + new URLSearchParams({
      client_id: env.meta.appId, client_secret: env.meta.appSecret,
      redirect_uri: env.meta.redirectUri, code,
    });
    const tokenRes = await fetch(tokenUrl).then((r) => r.json() as Promise<{ access_token?: string; error?: { message: string } }>);
    if (!tokenRes.access_token) throw BadRequest(tokenRes.error?.message ?? 'Meta authorization failed.');

    // 2. first ad account
    const acctRes = await fetch(`${GRAPH}/me/adaccounts?fields=account_id,name&access_token=${tokenRes.access_token}`)
      .then((r) => r.json() as Promise<{ data?: { account_id: string; name: string }[] }>);
    const acct = acctRes.data?.[0];

    const c = await prisma.metaConnection.update({
      where: { provider: 'meta' },
      data: {
        status: 'CONNECTED', accessToken: tokenRes.access_token,
        adAccountId: acct ? `act_${acct.account_id}` : env.meta.adAccountId || null,
        adAccountName: acct?.name ?? null, scopes: env.meta.scopes, lastError: null, isMock: false,
        connectedBy: userId ?? null,
      },
    });
    return publicConnection(c);
  },

  /** Demo connection used when no real app credentials exist. */
  async connectDemo(userId?: string) {
    const c = await prisma.metaConnection.update({
      where: { provider: 'meta' },
      data: {
        status: 'CONNECTED', isMock: true, adAccountId: 'act_demo', adAccountName: 'Demo Ad Account',
        pageName: 'MarkOps Demo Page', scopes: env.meta.scopes, lastError: null, connectedBy: userId ?? null,
      },
    });
    return publicConnection(c);
  },

  async test() {
    const c = await getOrCreate();
    if (c.status !== 'CONNECTED') throw BadRequest('Meta is not connected.');
    if (c.isMock || this.isMock) return { ok: true, message: 'Demo connection is active (mock mode).' };
    const res = await fetch(`${GRAPH}/me?access_token=${c.accessToken}`).then((r) => r.json() as Promise<{ id?: string; error?: { message: string } }>);
    if (res.error) {
      await prisma.metaConnection.update({ where: { provider: 'meta' }, data: { status: 'ERROR', lastError: res.error.message } });
      throw BadRequest(res.error.message);
    }
    return { ok: true, message: 'Connection is healthy.' };
  },

  async disconnect() {
    const c = await prisma.metaConnection.update({
      where: { provider: 'meta' },
      data: { status: 'NOT_CONNECTED', accessToken: null, adAccountId: null, adAccountName: null, pageId: null, pageName: null, instagramId: null, isMock: false, lastError: null },
    });
    return publicConnection(c);
  },

  async markSynced(): Promise<void> {
    await prisma.metaConnection.updateMany({ where: { provider: 'meta' }, data: { lastSyncAt: new Date() } });
  },

  /**
   * Ingest a lead received from a Meta leadgen webhook (or a normalized test
   * payload). Creates the lead + status history without a user context.
   * In production a leadgen_id would be resolved to field data via the Graph API.
   */
  async ingestLead(input: { name?: string; mobile?: string; email?: string; campaignId?: string; adId?: string; leadgenId?: string }) {
    const { code } = await import('../utils/code');
    const lead = await prisma.lead.create({
      data: {
        leadCode: code('LD'),
        name: input.name ?? `Meta Lead ${input.leadgenId ?? ''}`.trim(),
        mobile: input.mobile ?? null, email: input.email ?? null,
        source: 'META', platform: 'Meta', campaignId: input.campaignId ?? null, adId: input.adId ?? null,
        status: 'NEW',
      },
    });
    await prisma.leadStatusHistory.create({ data: { leadId: lead.id, oldStatus: null, newStatus: 'NEW', changedBy: 'meta-webhook' } });
    return lead;
  },

  /** Fetch today's insights for the given external ad refs (real when connected). */
  async fetchInsights(refs: { externalRef: string; seed: number }[]): Promise<MetaInsight[]> {
    const c = await getOrCreate();
    const live = c.status === 'CONNECTED' && !c.isMock && !!c.accessToken;
    if (!live) return refs.map((r) => synthetic(r.externalRef, r.seed));

    const out: MetaInsight[] = [];
    for (const r of refs) {
      try {
        const url = `${GRAPH}/${r.externalRef}/insights?fields=spend,impressions,reach,clicks,actions&access_token=${c.accessToken}`;
        const json = await fetch(url).then((x) => x.json() as Promise<{ data?: Array<Record<string, unknown>> }>);
        const row = json.data?.[0];
        if (!row) continue;
        const actions = (row.actions as Array<{ action_type: string; value: string }> | undefined) ?? [];
        const leads = Number(actions.find((a) => a.action_type === 'lead')?.value ?? 0);
        const conversions = Number(actions.find((a) => a.action_type.includes('purchase'))?.value ?? 0);
        out.push({
          externalRef: r.externalRef,
          spend: Number(row.spend ?? 0), impressions: Number(row.impressions ?? 0),
          reach: Number(row.reach ?? 0), clicks: Number(row.clicks ?? 0),
          leads, conversions, revenue: conversions * 2000,
        });
      } catch {
        /* skip this ad on error, continue others */
      }
    }
    return out;
  },
};

function synthetic(externalRef: string, seed: number): MetaInsight {
  const rnd = (min: number, max: number) => {
    const x = Math.sin(seed * 9301 + externalRef.length * 49297) * 233280;
    const frac = x - Math.floor(x);
    return Math.round(min + frac * (max - min));
  };
  const spend = rnd(3000, 18000);
  const leads = Math.max(1, rnd(120, 700));
  const clicks = leads + rnd(80, 400);
  const impressions = clicks * rnd(20, 60);
  return { externalRef, spend, impressions, reach: Math.round(impressions * 0.7), clicks, leads, conversions: Math.round(leads * 0.03), revenue: Math.round(leads * 0.03) * 2000 };
}
