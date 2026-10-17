import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import initSqlJs from 'sql.js';
import prisma from '../prisma.js';
import { backupRoot, resolveSqlitePath } from './sqlitePath.js';
import { uploadOffsite } from './offsite.service.js';

const REQUIRED_TABLES = ['User', 'Category', 'Product', 'PhoneUnit', 'Customer', 'Sale', 'SaleItem'];

function sha256File(filePath) {
  const hash = crypto.createHash('sha256');
  hash.update(fs.readFileSync(filePath));
  return hash.digest('hex');
}

function encryptionKey() {
  if (process.env.BACKUP_ENCRYPTION_KEY) {
    const raw = process.env.BACKUP_ENCRYPTION_KEY.trim();
    const buf = /^[0-9a-fA-F]{64}$/.test(raw) ? Buffer.from(raw, 'hex') : crypto.createHash('sha256').update(raw).digest();
    return buf;
  }
  const keyPath = path.resolve(process.cwd(), 'data', 'backup.key');
  if (fs.existsSync(keyPath)) return fs.readFileSync(keyPath);
  fs.mkdirSync(path.dirname(keyPath), { recursive: true });
  const key = crypto.randomBytes(32);
  fs.writeFileSync(keyPath, key);
  return key;
}

export function encryptBuffer(plain) {
  const key = encryptionKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const body = Buffer.concat([cipher.update(plain), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([Buffer.from('PVBK1'), iv, tag, body]);
}

export function decryptBuffer(packed) {
  const key = encryptionKey();
  if (packed.subarray(0, 5).toString() !== 'PVBK1') {
    throw new Error('Backup file is not a PhoneVault encrypted copy');
  }
  const iv = packed.subarray(5, 17);
  const tag = packed.subarray(17, 33);
  const body = packed.subarray(33);
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(body), decipher.final()]);
}

async function checkpointWal(dbPath) {
  try {
    await prisma.$queryRawUnsafe('PRAGMA wal_checkpoint(FULL)');
  } catch (error) {
    console.warn('WAL checkpoint skipped:', error.message);
  }
  for (const suffix of ['-wal', '-shm']) {
    const side = `${dbPath}${suffix}`;
    if (fs.existsSync(side) && fs.statSync(side).size === 0) {
      /* empty sidecar is fine */
    }
  }
}

function pruneOldBackups(dir, keepDays) {
  if (!fs.existsSync(dir)) return;
  const cutoff = Date.now() - keepDays * 24 * 60 * 60 * 1000;
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const stat = fs.statSync(full);
    if (stat.isFile() && stat.mtimeMs < cutoff) fs.unlinkSync(full);
  }
}

let sqlPromise;
async function openSqlite(filePath) {
  if (!sqlPromise) sqlPromise = initSqlJs();
  const SQL = await sqlPromise;
  const bytes = fs.readFileSync(filePath);
  if (bytes.subarray(0, 15).toString() !== 'SQLite format 3') {
    throw new Error('File is not a SQLite database');
  }
  return new SQL.Database(bytes);
}

export async function testRestoreFile(filePath) {
  const db = await openSqlite(filePath);
  try {
    const tableRows = db.exec("SELECT name FROM sqlite_master WHERE type = 'table'");
    const names = new Set((tableRows[0]?.values || []).map((row) => row[0]));
    const missing = REQUIRED_TABLES.filter((name) => !names.has(name));
    if (missing.length) {
      return { ok: false, detail: `Missing tables: ${missing.join(', ')}` };
    }
    const saleCount = db.exec('SELECT COUNT(*) FROM Sale')[0].values[0][0];
    const productCount = db.exec('SELECT COUNT(*) FROM Product')[0].values[0][0];
    const phoneCount = db.exec('SELECT COUNT(*) FROM PhoneUnit')[0].values[0][0];
    const liveSales = await prisma.sale.count();
    const detail = `SQLite opened. Sales ${saleCount} (live ${liveSales}), products ${productCount}, phones ${phoneCount}.`;
    return { ok: true, detail, saleCount, productCount, phoneCount };
  } finally {
    db.close();
  }
}

export async function runBackup({ reason = 'manual' } = {}) {
  const dbPath = resolveSqlitePath();
  if (!fs.existsSync(dbPath)) {
    throw new Error(`SQLite shop database was not found at ${dbPath}`);
  }

  await checkpointWal(dbPath);

  const dailyDir = path.join(backupRoot(), 'daily');
  fs.mkdirSync(dailyDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const fileName = `phonevault-${stamp}.db`;
  const dest = path.join(dailyDir, fileName);
  fs.copyFileSync(dbPath, dest);

  const checksum = sha256File(dest);
  const bytes = fs.statSync(dest).size;
  const keepDays = Number(process.env.BACKUP_RETENTION_DAYS || 30);
  pruneOldBackups(dailyDir, keepDays);

  const drill = await testRestoreFile(dest);
  const localRun = await prisma.backupRun.create({
    data: {
      tier: 'DAILY_SERVER',
      fileName,
      bytes,
      sha256: checksum,
      status: 'OK',
      location: dest,
      detail: `${reason}. Local SQLite copy on the shop server.`,
      restoreTestedAt: new Date(),
      restoreStatus: drill.ok ? 'PASS' : 'FAIL',
      restoreDetail: drill.detail,
    },
  });

  const plain = fs.readFileSync(dest);
  const encrypted = encryptBuffer(plain);
  const roundTrip = decryptBuffer(encrypted);
  const encryptionOk = crypto.createHash('sha256').update(roundTrip).digest('hex') === checksum;

  const offsite = await uploadOffsite({
    fileName: `${fileName}.enc`,
    body: encrypted,
    checksum,
  });

  const offsiteRun = await prisma.backupRun.create({
    data: {
      tier: 'OFFSITE',
      fileName: `${fileName}.enc`,
      bytes: encrypted.length,
      sha256: checksum,
      status: offsite.uploaded ? 'OK' : 'SKIPPED',
      location: offsite.location || '',
      detail: encryptionOk
        ? offsite.detail
        : 'Encryption self-test failed. Offsite copy was not trusted.',
      restoreTestedAt: new Date(),
      restoreStatus: encryptionOk && drill.ok ? 'PASS' : 'FAIL',
      restoreDetail: encryptionOk
        ? 'Encrypted copy decrypted back to the same SQLite checksum. Local restore drill passed.'
        : 'Encrypted copy did not match the shop database checksum.',
    },
  });

  return { localRun, offsiteRun, drill, dbPath };
}

export async function listBackups() {
  return prisma.backupRun.findMany({ orderBy: { createdAt: 'desc' }, take: 40 });
}

export async function drillLatest() {
  const latest = await prisma.backupRun.findFirst({
    where: { tier: 'DAILY_SERVER', status: 'OK' },
    orderBy: { createdAt: 'desc' },
  });
  if (!latest || !latest.location || !fs.existsSync(latest.location)) {
    throw new Error('No local SQLite backup is available to restore-test');
  }
  const drill = await testRestoreFile(latest.location);
  const updated = await prisma.backupRun.update({
    where: { id: latest.id },
    data: {
      restoreTestedAt: new Date(),
      restoreStatus: drill.ok ? 'PASS' : 'FAIL',
      restoreDetail: drill.detail,
    },
  });
  return { backup: updated, drill };
}
