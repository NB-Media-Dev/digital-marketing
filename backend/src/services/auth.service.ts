import jwt from 'jsonwebtoken';
import { prisma } from '../database/prisma';
import { comparePassword, hashPassword } from '../utils/password';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt';
import { Unauthorized } from '../utils/response';
import { ROLE_HOME, ROLE_PERMISSIONS, RoleCode } from '../common/rbac';
import { uuid } from '../utils/uuid';

type UserWithRole = Awaited<ReturnType<typeof loadUser>>;

async function loadUser(id: string) {
  return prisma.user.findUnique({ where: { id }, include: { role: true } });
}

interface Meta { ip?: string; ua?: string }

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

function profile(user: NonNullable<UserWithRole>) {
  const roleCode = user.role.code as RoleCode;
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    employeeCode: user.employeeCode,
    profileImage: user.profileImage,
    roleCode,
    roleName: user.role.name,
    permissions: ROLE_PERMISSIONS[roleCode] ?? [],
    home: ROLE_HOME[roleCode] ?? '/',
  };
}

async function issueTokens(user: NonNullable<UserWithRole>, meta: Meta): Promise<TokenPair> {
  const accessToken = signAccessToken({ sub: user.id, roleCode: user.role.code });
  const jti = uuid();
  const refreshToken = signRefreshToken({ sub: user.id, jti });
  const decoded = jwt.decode(refreshToken) as { exp: number };

  await prisma.refreshToken.create({
    data: {
      id: jti,
      userId: user.id,
      tokenHash: await hashPassword(refreshToken),
      expiresAt: new Date(decoded.exp * 1000),
      userAgent: meta.ua ?? null,
      ipAddress: meta.ip ?? null,
    },
  });
  return { accessToken, refreshToken };
}

export const authService = {
  async login(email: string, password: string, meta: Meta) {
    const user = await prisma.user.findFirst({
      where: { email: email.toLowerCase().trim(), deletedAt: null },
      include: { role: true },
    });
    if (!user || user.status !== 'ACTIVE') throw Unauthorized('Incorrect email or password.');

    const ok = await comparePassword(password, user.passwordHash);
    if (!ok) throw Unauthorized('Incorrect email or password.');

    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    const tokens = await issueTokens(user, meta);
    return { ...tokens, user: profile(user) };
  },

  async refresh(presented: string | undefined, meta: Meta) {
    if (!presented) throw Unauthorized('Session expired. Please sign in again.');
    let payload: { sub: string; jti: string };
    try {
      payload = verifyRefreshToken(presented);
    } catch {
      throw Unauthorized('Session expired. Please sign in again.');
    }

    const stored = await prisma.refreshToken.findUnique({ where: { id: payload.jti } });
    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      throw Unauthorized('Session expired. Please sign in again.');
    }
    const matches = await comparePassword(presented, stored.tokenHash);
    if (!matches) {
      // reuse/tamper — revoke every session for this user
      await prisma.refreshToken.updateMany({ where: { userId: stored.userId }, data: { revokedAt: new Date() } });
      throw Unauthorized('Session expired. Please sign in again.');
    }

    await prisma.refreshToken.update({ where: { id: stored.id }, data: { revokedAt: new Date() } });
    const user = await loadUser(payload.sub);
    if (!user || user.status !== 'ACTIVE') throw Unauthorized();
    const tokens = await issueTokens(user, meta);
    return { ...tokens, user: profile(user) };
  },

  async logout(refreshToken?: string) {
    if (!refreshToken) return { ok: true };
    try {
      const payload = verifyRefreshToken(refreshToken);
      await prisma.refreshToken.updateMany({ where: { id: payload.jti }, data: { revokedAt: new Date() } });
    } catch {
      /* already invalid */
    }
    return { ok: true };
  },

  async me(userId: string) {
    const user = await loadUser(userId);
    if (!user) throw Unauthorized();
    return profile(user);
  },
};
