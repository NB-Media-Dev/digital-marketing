import { prisma } from '../database/prisma';
import { getPageParams, buildMeta } from '../utils/pagination';
import { Request } from 'express';

interface AuditInput {
  userId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  oldValue?: unknown;
  newValue?: unknown;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export const auditService = {
  /** Append an immutable audit record. Never throws into the caller's flow. */
  async record(input: AuditInput): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          userId: input.userId ?? null,
          action: input.action,
          entityType: input.entityType,
          entityId: input.entityId ?? null,
          oldValue: (input.oldValue ?? undefined) as never,
          newValue: (input.newValue ?? undefined) as never,
          ipAddress: input.ipAddress ?? null,
          userAgent: input.userAgent ?? null,
        },
      });
    } catch {
      /* auditing must not break business operations */
    }
  },

  async list(req: Request) {
    const params = getPageParams(req);
    const where: Record<string, unknown> = {};
    if (typeof req.query.action === 'string') where.action = req.query.action;
    if (typeof req.query.entityType === 'string') where.entityType = req.query.entityType;
    const [items, total] = await Promise.all([
      prisma.auditLog.findMany({ where, orderBy: { createdAt: 'desc' }, skip: params.skip, take: params.take }),
      prisma.auditLog.count({ where }),
    ]);
    return { items, meta: buildMeta(total, params) };
  },
};
