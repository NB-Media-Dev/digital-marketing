import { Request, Response, NextFunction } from 'express';
import { Forbidden, Unauthorized } from '../utils/response';
import { RoleCode } from '../common/rbac';

/** Requires the authenticated user to hold one of the given roles. */
export function requireRole(...roles: RoleCode[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) return next(Unauthorized());
    if (!roles.includes(req.user.roleCode as RoleCode)) return next(Forbidden());
    next();
  };
}
