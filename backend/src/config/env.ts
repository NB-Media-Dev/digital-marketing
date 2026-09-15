import dotenv from 'dotenv';
dotenv.config();

function required(name: string, fallback?: string): string {
  const v = process.env[name] ?? fallback;
  if (v === undefined) throw new Error(`Missing required env var: ${name}`);
  return v;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  isProd: process.env.NODE_ENV === 'production',
  port: parseInt(process.env.PORT ?? '5000', 10),
  apiPrefix: process.env.API_PREFIX ?? '/api',
  clientUrl: process.env.CLIENT_URL ?? 'http://localhost:4200',

  databaseUrl: required('DATABASE_URL', 'mysql://root@localhost:3306/markops'),

  jwt: {
    secret: required('JWT_SECRET', 'dev-access-secret'),
    refreshSecret: required('JWT_REFRESH_SECRET', 'dev-refresh-secret'),
    expiresIn: process.env.JWT_EXPIRES_IN ?? '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
    cookieSecure: process.env.COOKIE_SECURE === 'true',
  },

  meta: {
    appId: process.env.META_APP_ID ?? '',
    appSecret: process.env.META_APP_SECRET ?? '',
    accessToken: process.env.META_ACCESS_TOKEN ?? '',
    adAccountId: process.env.META_AD_ACCOUNT_ID ?? '',
    redirectUri: process.env.META_REDIRECT_URI ?? 'http://localhost:5000/api/meta/callback',
    apiVersion: process.env.META_API_VERSION ?? 'v21.0',
    webhookVerifyToken: process.env.META_WEBHOOK_VERIFY_TOKEN ?? 'markops-verify',
    scopes: 'ads_read,ads_management,leads_retrieval,pages_show_list,business_management',
    syncCron: process.env.META_SYNC_CRON ?? '*/15 * * * *',
    /** True when app credentials are absent — MetaService runs in mock/demo mode. */
    get mock(): boolean {
      return !process.env.META_APP_ID || !process.env.META_APP_SECRET;
    },
  },

  upload: {
    dir: process.env.UPLOAD_DIR ?? 'uploads',
    maxSizeMb: parseInt(process.env.MAX_FILE_SIZE_MB ?? '50', 10),
  },
};
