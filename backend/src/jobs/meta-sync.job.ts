import { adService } from '../services/ad.service';

/** Pull the latest ad metrics from Meta (mock-aware). */
export async function metaSyncJob(): Promise<void> {
  const log = await adService.sync('SCHEDULED');
  // eslint-disable-next-line no-console
  console.log(`[cron] meta-sync: ${log.status}, ${log.adsSynced} ad(s)`);
}
