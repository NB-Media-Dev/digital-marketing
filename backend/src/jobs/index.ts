import cron from 'node-cron';
import { env } from '../config/env';
import { metaSyncJob } from './meta-sync.job';
import { dailyPerformanceJob, followupReminderJob, overdueTaskJob } from './daily-performance.job';

/** Registers all scheduled jobs. Called once from server.ts. */
export function startJobs(): void {
  // Meta sync — every 15 minutes (configurable).
  cron.schedule(env.meta.syncCron, () => { void metaSyncJob(); });
  // Daily performance aggregation — nightly at 00:15.
  cron.schedule('15 0 * * *', () => { void dailyPerformanceJob(); });
  // Overdue task detection — hourly.
  cron.schedule('0 * * * *', () => { void overdueTaskJob(); });
  // Follow-up reminders — hourly.
  cron.schedule('30 * * * *', () => { void followupReminderJob(); });

  // eslint-disable-next-line no-console
  console.log('[cron] jobs scheduled (meta-sync, daily-performance, overdue, follow-ups)');
}
