import { Response, Request, NextFunction, RequestHandler } from 'express';
import { Prisma } from '@prisma/client';

/** Application error carrying an HTTP status and a stable error code. */
export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly errorCode = 'ERROR',
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const BadRequest = (m: string) => new AppError(400, m, 'BAD_REQUEST');
export const Unauthorized = (m = 'Your session has expired. Please sign in again.') =>
  new AppError(401, m, 'UNAUTHORIZED');
export const Forbidden = (m = "You don't have permission to perform this action.") =>
  new AppError(403, m, 'FORBIDDEN');
export const NotFound = (m = 'Not found.') => new AppError(404, m, 'NOT_FOUND');

/**
 * Recursively convert Prisma Decimal / BigInt to plain numbers so JSON output
 * carries numeric values (the Angular client formats and computes on numbers).
 */
export function serialize<T>(value: T): T {
  if (value === null || value === undefined) return value;
  if (typeof value === 'bigint') return Number(value) as unknown as T;
  if (value instanceof Prisma.Decimal) return value.toNumber() as unknown as T;
  if (value instanceof Date) return value as unknown as T;
  if (Array.isArray(value)) return value.map((v) => serialize(v)) as unknown as T;
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) out[k] = serialize(v);
    return out as unknown as T;
  }
  return value;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export function sendSuccess(res: Response, data: unknown, message = 'OK', status = 200): void {
  res.status(status).json({ success: true, message, data: serialize(data) });
}

export function sendCreated(res: Response, data: unknown, message = 'Created'): void {
  sendSuccess(res, data, message, 201);
}

export function sendPaginated(
  res: Response,
  data: unknown[],
  pagination: PaginationMeta,
  message = 'OK',
): void {
  res.status(200).json({ success: true, message, data: serialize(data), pagination });
}

/** Wraps an async route handler so thrown/rejected errors reach the error middleware. */
export function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
