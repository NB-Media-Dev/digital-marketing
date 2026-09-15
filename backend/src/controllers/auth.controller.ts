import { Request, Response } from 'express';
import { authService } from '../services/auth.service';
import { sendSuccess, sendCreated } from '../utils/response';
import { env } from '../config/env';

function setCookies(res: Response, accessToken: string, refreshToken: string): void {
  const secure = env.jwt.cookieSecure;
  // Cross-site (frontend and API on different domains, e.g. Vercel + Render) needs
  // SameSite=None; Secure so the refresh cookie is sent. Locally, Lax over http.
  const sameSite = secure ? ('none' as const) : ('lax' as const);
  const common = { httpOnly: true, secure, sameSite };
  res.cookie('access_token', accessToken, { ...common, path: '/', maxAge: 15 * 60 * 1000 });
  res.cookie('refresh_token', refreshToken, { ...common, path: '/api/auth', maxAge: 7 * 24 * 60 * 60 * 1000 });
}

export const authController = {
  async login(req: Request, res: Response) {
    const { email, password } = req.body;
    const result = await authService.login(email, password, { ip: req.ip, ua: req.headers['user-agent'] });
    setCookies(res, result.accessToken, result.refreshToken);
    sendCreated(res, result, 'Signed in successfully.');
  },

  async refresh(req: Request, res: Response) {
    const presented = req.cookies?.refresh_token ?? req.body?.refreshToken;
    const result = await authService.refresh(presented, { ip: req.ip, ua: req.headers['user-agent'] });
    setCookies(res, result.accessToken, result.refreshToken);
    sendSuccess(res, result, 'Session refreshed.');
  },

  async logout(req: Request, res: Response) {
    await authService.logout(req.cookies?.refresh_token ?? req.body?.refreshToken);
    res.clearCookie('access_token', { path: '/' });
    res.clearCookie('refresh_token', { path: '/api/auth' });
    sendSuccess(res, { ok: true }, 'Signed out.');
  },

  async me(req: Request, res: Response) {
    sendSuccess(res, await authService.me(req.user!.id));
  },
};
