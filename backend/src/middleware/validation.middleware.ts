import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';
import { AppError } from '../utils/response';

/** Validates req.body against a Zod schema and replaces it with the parsed value. */
export function validateBody<T>(schema: ZodSchema<T>) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const first = result.error.errors[0];
      const message = first ? `${first.path.join('.') || 'field'}: ${first.message}` : 'Invalid request.';
      return next(new AppError(422, message, 'VALIDATION_ERROR'));
    }
    req.body = result.data;
    next();
  };
}
