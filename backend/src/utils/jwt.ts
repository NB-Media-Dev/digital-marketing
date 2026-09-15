import jwt, { SignOptions } from 'jsonwebtoken';
import { env } from '../config/env';

export interface AccessPayload {
  sub: string;
  roleCode: string;
}
export interface RefreshPayload {
  sub: string;
  jti: string;
}

export function signAccessToken(payload: AccessPayload): string {
  return jwt.sign(payload, env.jwt.secret, { expiresIn: env.jwt.expiresIn } as SignOptions);
}

export function signRefreshToken(payload: RefreshPayload): string {
  return jwt.sign(payload, env.jwt.refreshSecret, { expiresIn: env.jwt.refreshExpiresIn } as SignOptions);
}

export function verifyAccessToken(token: string): AccessPayload {
  return jwt.verify(token, env.jwt.secret) as AccessPayload;
}

export function verifyRefreshToken(token: string): RefreshPayload {
  return jwt.verify(token, env.jwt.refreshSecret) as RefreshPayload;
}
