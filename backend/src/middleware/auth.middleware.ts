import { Request, Response, NextFunction } from 'express';
import { prisma } from '../database/prisma';
import { verifyAccessToken } from '../utils/jwt';
import { Unauthorized } from '../utils/response';
import { ROLE_PERMISSIONS, RoleCode } from '../common/rbac';

function extractToken(req: Request): string | undefined {
  const cookieToken = req.cookies?.access_token as string | undefined;
  if (cookieToken) return cookieToken;
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) return header.slice(7);
  return undefined;
}

/**
 * Authentication guard. Verifies the access token, loads the live user, and
 * attaches { id, email, name, roleCode, permissions } to req.user.
 * Permissions are derived from the role catalogue (backend-controlled).
 */
export async function authenticate(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const token = extractToken(req);
    if (!token) throw Unauthorized();
    const payload = verifyAccessToken(token);

    const user = await prisma.user.findFirst({
      where: { id: payload.sub, status: 'ACTIVE', deletedAt: null },
      include: { role: true },
    });
    if (!user) throw Unauthorized('Your account is no longer active.');

    req.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      roleCode: user.role.code,
      permissions: ROLE_PERMISSIONS[user.role.code as RoleCode] ?? [],
    };
    next();
  } catch (err) {
    if ((err as { name?: string }).name === 'TokenExpiredError' || (err as { name?: string }).name === 'JsonWebTokenError') {
      next(Unauthorized());
    } else {
      next(err);
    }
  }
}
