import { LeadStatus, Prisma } from '@prisma/client';
import { prisma } from '../database/prisma';
import { BadRequest, Forbidden, NotFound } from '../utils/response';
import { ActionContext } from '../types/context';
import { RoleCode } from '../common/rbac';
import { PageParams, buildMeta } from '../utils/pagination';
import { code } from '../utils/code';
import { pct } from '../utils/calculations';
import { auditService } from './audit.service';
import { notificationService } from './notification.service';
import { socketService } from './socket.service';
import { EVENTS } from '../socket/events';

const CONTACTED: LeadStatus[] = [
  'CONTACTED', 'INTERESTED', 'NOT_INTERESTED', 'FOLLOW_UP', 'QUALIFIED', 'CONVERTED', 'LOST',
];

interface LeadInput {
  name: string;
  mobile?: string;
  email?: string;
  source?: 'META' | 'FACEBOOK' | 'INSTAGRAM' | 'GOOGLE' | 'WEBSITE' | 'WHATSAPP' | 'MANUAL' | 'OTHER';
  platform?: string;
  campaignId?: string;
  adId?: string;
}

interface LeadFilters {
  status?: LeadStatus;
  source?: string;
  campaignId?: string;
  telecallerId?: string;
}

function isTelecaller(ctx: ActionContext): boolean {
  return ctx.user.roleCode === RoleCode.TELECALLER;
}

export const leadService = {
  async list(ctx: ActionContext, filters: LeadFilters, params: PageParams) {
    const where: Prisma.LeadWhereInput = { deletedAt: null };
    if (isTelecaller(ctx)) where.assignedTo = ctx.user.id;
    else if (filters.telecallerId) where.assignedTo = filters.telecallerId;
    if (filters.status) where.status = filters.status;
    if (filters.source) where.source = filters.source as Prisma.LeadWhereInput['source'];
    if (filters.campaignId) where.campaignId = filters.campaignId;
    if (params.search) {
      where.OR = [
        { name: { contains: params.search } },
        { mobile: { contains: params.search } },
        { leadCode: { contains: params.search } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.lead.findMany({
        where,
        include: { campaign: { select: { name: true } }, telecaller: { select: { name: true } } },
        orderBy: { createdAt: 'desc' }, skip: params.skip, take: params.take,
      }),
      prisma.lead.count({ where }),
    ]);
    return { items, meta: buildMeta(total, params) };
  },

  async findOne(id: string, ctx: ActionContext) {
    const lead = await prisma.lead.findFirst({
      where: { id, deletedAt: null },
      include: { campaign: { select: { name: true } }, ad: { select: { name: true } }, telecaller: { select: { name: true } } },
    });
    if (!lead) throw NotFound('That lead could not be found.');
    if (isTelecaller(ctx) && lead.assignedTo !== ctx.user.id) throw Forbidden('You can only view leads assigned to you.');
    return lead;
  },

  async create(input: LeadInput, ctx: ActionContext) {
    const lead = await prisma.lead.create({
      data: { leadCode: code('LD'), name: input.name, mobile: input.mobile, email: input.email, source: input.source ?? 'MANUAL', platform: input.platform, campaignId: input.campaignId, adId: input.adId, status: 'NEW' },
    });
    await prisma.leadStatusHistory.create({ data: { leadId: lead.id, oldStatus: null, newStatus: 'NEW', changedBy: ctx.user.id } });
    await auditService.record({ userId: ctx.user.id, action: 'LEAD_CREATED', entityType: 'lead', entityId: lead.id, newValue: { name: lead.name }, ipAddress: ctx.ip });
    socketService.broadcast(EVENTS.lead.created, { id: lead.id, leadCode: lead.leadCode });
    return lead;
  },

  async assign(id: string, telecallerId: string, ctx: ActionContext) {
    const lead = await prisma.lead.findUnique({ where: { id } });
    if (!lead) throw NotFound('Lead not found.');
    const tc = await prisma.user.findUnique({ where: { id: telecallerId }, include: { role: true } });
    if (!tc || tc.role.code !== RoleCode.TELECALLER) throw BadRequest('Please choose a valid telecaller.');

    const nextStatus = lead.status === 'NEW' ? LeadStatus.ASSIGNED : lead.status;
    const updated = await prisma.$transaction(async (tx) => {
      await tx.leadAssignment.updateMany({ where: { leadId: id, isCurrent: true }, data: { isCurrent: false, unassignedAt: new Date() } });
      await tx.leadAssignment.create({ data: { leadId: id, telecallerId, assignedBy: ctx.user.id, isCurrent: true } });
      return tx.lead.update({ where: { id }, data: { assignedTo: telecallerId, status: nextStatus } });
    });

    await auditService.record({ userId: ctx.user.id, action: 'LEAD_ASSIGNED', entityType: 'lead', entityId: id, oldValue: { assignedTo: lead.assignedTo }, newValue: { assignedTo: telecallerId }, ipAddress: ctx.ip });
    await notificationService.notify({ userId: telecallerId, type: 'LEAD_ASSIGNED', title: 'New lead assigned', message: `${lead.name} was assigned to you.`, entityType: 'lead', entityId: id });
    socketService.toUser(telecallerId, EVENTS.lead.assigned, updated);
    return updated;
  },

  async updateStatus(id: string, status: LeadStatus, remarks: string | undefined, ctx: ActionContext) {
    const lead = await this.findOne(id, ctx);
    const old = lead.status;
    const updated = await prisma.$transaction(async (tx) => {
      const l = await tx.lead.update({ where: { id }, data: { status } });
      await tx.leadStatusHistory.create({ data: { leadId: id, oldStatus: old, newStatus: status, changedBy: ctx.user.id, remarks } });
      return l;
    });
    await auditService.record({ userId: ctx.user.id, action: 'LEAD_STATUS_CHANGED', entityType: 'lead', entityId: id, oldValue: { status: old }, newValue: { status }, ipAddress: ctx.ip });
    socketService.broadcast(EVENTS.lead.statusChanged, { id, status });
    return updated;
  },

  history(id: string) {
    return prisma.leadStatusHistory.findMany({ where: { leadId: id }, orderBy: { createdAt: 'asc' } });
  },

  async funnel(campaignId?: string) {
    const where: Prisma.LeadWhereInput = { deletedAt: null };
    if (campaignId) where.campaignId = campaignId;
    const grouped = await prisma.lead.groupBy({ by: ['status'], where, _count: { _all: true } });
    const by: Record<string, number> = {};
    for (const g of grouped) by[g.status] = g._count._all;

    const total = Object.values(by).reduce((a, b) => a + b, 0);
    const contacted = CONTACTED.reduce((a, s) => a + (by[s] ?? 0), 0);
    const interested = (by.INTERESTED ?? 0) + (by.QUALIFIED ?? 0) + (by.CONVERTED ?? 0);
    const qualified = (by.QUALIFIED ?? 0) + (by.CONVERTED ?? 0);
    const converted = by.CONVERTED ?? 0;
    return {
      generated: total, contacted, interested, qualified, converted,
      contactedRate: pct(contacted, total),
      interestedRate: pct(interested, contacted),
      qualifiedRate: pct(qualified, total),
      conversionRate: pct(converted, total),
    };
  },

  /** Not-interested ratio by lead source. */
  async notInterested() {
    const rows = await prisma.$queryRawUnsafe<{ source: string; total: bigint; contacted: bigint; notInterested: bigint }[]>(
      `SELECT source,
              COUNT(*) AS total,
              SUM(status IN ('CONTACTED','INTERESTED','NOT_INTERESTED','FOLLOW_UP','QUALIFIED','CONVERTED','LOST')) AS contacted,
              SUM(status = 'NOT_INTERESTED') AS notInterested
       FROM leads WHERE deleted_at IS NULL GROUP BY source`,
    );
    return rows.map((r) => {
      const contacted = Number(r.contacted);
      const ni = Number(r.notInterested);
      return { source: r.source, total: Number(r.total), contacted, notInterested: ni, ratio: pct(ni, contacted) };
    });
  },

  async sourcePerformance() {
    const rows = await prisma.$queryRawUnsafe<{ source: string; leads: bigint; qualified: bigint; converted: bigint }[]>(
      `SELECT source, COUNT(*) AS leads,
              SUM(status = 'QUALIFIED' OR status = 'CONVERTED') AS qualified,
              SUM(status = 'CONVERTED') AS converted
       FROM leads WHERE deleted_at IS NULL GROUP BY source`,
    );
    return rows.map((r) => ({
      source: r.source, leads: Number(r.leads), qualified: Number(r.qualified), converted: Number(r.converted),
      qualifiedRate: pct(Number(r.qualified), Number(r.leads)),
    }));
  },
};
