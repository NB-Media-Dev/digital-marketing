import { Request, Response, NextFunction } from 'express';
import { Forbidden, Unauthorized } from '../utils/response';
import { Permission } from '../common/rbac';

/**
 * Requires the authenticated user to hold ALL listed permissions.
 * Authorization lives here — never duplicated inside controllers.
 */
export function requirePermission(...perms: Permission[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) return next(Unauthorized());
    const held = req.user.permissions;
    const ok = perms.every((p) => held.includes(p));
    if (!ok) return next(Forbidden());
    next();
  };
}
