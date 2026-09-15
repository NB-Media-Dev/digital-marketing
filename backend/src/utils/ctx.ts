import { Request } from 'express';
import { ActionContext } from '../types/context';

/** Build the per-request ActionContext from an authenticated request. */
export function ctxFrom(req: Request): ActionContext {
  return {
    user: req.user!,
    ip: req.ip,
    ua: req.headers['user-agent'],
  };
}
