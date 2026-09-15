import { CorsOptions } from 'cors';
import { env } from './env';

const LOCALHOST = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

/**
 * Allow the configured CLIENT_URL, plus any localhost port in development
 * (so `ng serve` works whatever port it picks). Credentials are enabled for
 * cookie-based auth, which requires reflecting a specific origin (never "*").
 */
export const corsOptions: CorsOptions = {
  credentials: true,
  origin(origin, callback) {
    // Non-browser clients (curl, server-to-server) send no Origin — allow.
    if (!origin) return callback(null, true);
    if (origin === env.clientUrl) return callback(null, true);
    if (!env.isProd && LOCALHOST.test(origin)) return callback(null, true);
    return callback(new Error('Not allowed by CORS'));
  },
};

/** Origin check for Socket.IO (same policy, boolean callback). */
export function socketOrigin(origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void): void {
  if (!origin) return callback(null, true);
  if (origin === env.clientUrl) return callback(null, true);
  if (!env.isProd && LOCALHOST.test(origin)) return callback(null, true);
  return callback(new Error('Not allowed by CORS'));
}
