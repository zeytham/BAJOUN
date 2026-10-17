import dotenv from 'dotenv';
import prisma from '../prisma.js';
import { runBackup } from '../services/backup.service.js';

dotenv.config();

const result = await runBackup({ reason: 'manual-script' });
console.log(JSON.stringify({
  file: result.localRun.fileName,
  restore: result.localRun.restoreStatus,
  detail: result.drill.detail,
  offsite: result.offsiteRun.status,
  offsiteDetail: result.offsiteRun.detail,
}, null, 2));
await prisma.$disconnect();
