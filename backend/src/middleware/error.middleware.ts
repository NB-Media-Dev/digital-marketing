import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { MulterError } from 'multer';
import { AppError } from '../utils/response';
import { env } from '../config/env';

/** 404 for unmatched routes. */
export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({ success: false, message: 'Route not found.', errorCode: 'NOT_FOUND', path: req.originalUrl });
}

/**
 * Central error handler. Maps every error to a friendly, non-technical message.
 * Real details are logged server-side; stack traces never reach the client.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  let status = 500;
  let message = 'Something went wrong. Please try again.';
  let errorCode = 'INTERNAL_ERROR';

  if (err instanceof AppError) {
    status = err.statusCode;
    message = err.message;
    errorCode = err.errorCode;
  } else if (err instanceof MulterError) {
    status = 400;
    errorCode = 'UPLOAD_ERROR';
    message = err.code === 'LIMIT_FILE_SIZE' ? 'That file is too large.' : 'The file could not be uploaded.';
  } else if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') { status = 409; message = 'That record already exists.'; errorCode = 'DUPLICATE'; }
    else if (err.code === 'P2025') { status = 404; message = 'That record could not be found.'; errorCode = 'NOT_FOUND'; }
    else { status = 400; message = 'The request could not be completed.'; errorCode = 'DB_ERROR'; }
  } else if (err instanceof Prisma.PrismaClientValidationError) {
    status = 400; message = 'The request data was invalid.'; errorCode = 'DB_VALIDATION';
  }

  if (status >= 500) {
    // eslint-disable-next-line no-console
    console.error(`[Error] ${req.method} ${req.originalUrl}`, err);
  }

  const body: Record<string, unknown> = { success: false, message, errorCode };
  if (!env.isProd && status >= 500 && err instanceof Error) body.detail = err.message;
  res.status(status).json(body);
}
