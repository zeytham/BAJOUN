import fs from 'fs';
import path from 'path';

/** Shop database is a SQLite file on this machine. No PostgreSQL server. */
export function resolveSqlitePath() {
  const raw = (process.env.DATABASE_URL || 'file:./dev.db').replace(/^file:/, '').split('?')[0];
  const name = path.basename(raw);
  const candidates = [
    path.isAbsolute(raw) ? raw : null,
    path.resolve(process.cwd(), raw),
    path.resolve(process.cwd(), 'prisma', name),
    path.resolve(process.cwd(), 'backend', 'prisma', name),
  ].filter(Boolean);

  const found = candidates.find((candidate) => fs.existsSync(candidate));
  return found || path.resolve(process.cwd(), 'prisma', name);
}

export function backupRoot() {
  return path.resolve(process.cwd(), process.env.BACKUP_DIR || 'backups');
}
