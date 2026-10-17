import cron from 'node-cron';
import { runBackup } from '../services/backup.service.js';
import { pushUnsyncedSales } from '../services/cloudSync.service.js';

export function startShopJobs() {
  const backupCron = process.env.BACKUP_CRON || '15 2 * * *';
  if (cron.validate(backupCron)) {
    cron.schedule(backupCron, async () => {
      try {
        const result = await runBackup({ reason: 'daily' });
        console.log(`Daily SQLite backup ${result.localRun.fileName} restore ${result.localRun.restoreStatus}`);
      } catch (error) {
        console.error('Daily backup failed:', error.message);
      }
    }, { timezone: 'Africa/Dar_es_Salaam' });
  }

  cron.schedule('*/2 * * * *', async () => {
    try {
      const result = await pushUnsyncedSales();
      if (!result.skipped && (result.sent || result.failed)) {
        console.log(`Cloud sync sent ${result.sent}, failed ${result.failed}, pending ${result.pending}`);
      }
    } catch (error) {
      console.error('Cloud sync failed:', error.message);
    }
  });
}
