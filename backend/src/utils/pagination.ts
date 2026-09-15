import { Request } from 'express';
import { PaginationMeta } from './response';

export interface PageParams {
  page: number;
  limit: number;
  skip: number;
  take: number;
  search?: string;
}

export function getPageParams(req: Request): PageParams {
  const page = Math.max(1, parseInt(String(req.query.page ?? '1'), 10) || 1);
  const limit = Math.min(200, Math.max(1, parseInt(String(req.query.limit ?? '20'), 10) || 20));
  const search = typeof req.query.search === 'string' && req.query.search ? req.query.search : undefined;
  return { page, limit, skip: (page - 1) * limit, take: limit, search };
}

export function buildMeta(total: number, params: PageParams): PaginationMeta {
  return {
    page: params.page,
    limit: params.limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / params.limit)),
  };
}
