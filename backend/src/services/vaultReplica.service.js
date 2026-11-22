import fs from 'fs';
import path from 'path';
import { mergeVault, vaultStamp } from './vaultMerge.js';
import { syncVaultDebts } from './debt.service.js';

function vaultPath() {
  const mount = process.env.RAILWAY_VOLUME_MOUNT_PATH || (fs.existsSync('/data') ? '/data' : '');
  const preferred = mount ? path.join(mount, 'vault-replica.json') : path.resolve('data', 'vault-replica.json');
  const legacy = path.resolve('data', 'vault-replica.json');
  if (preferred !== legacy && !fs.existsSync(preferred) && fs.existsSync(legacy)) {
    fs.mkdirSync(path.dirname(preferred), { recursive: true });
    fs.copyFileSync(legacy, preferred);
  }
  return preferred;
}

const file = vaultPath();
const listeners = new Set();
let cachedVault = null;
let cachedMtime = 0;

function remember(parsed, mtime) {
  cachedVault = parsed;
  cachedMtime = mtime;
  return parsed;
}

export function watchVault(since) {
  const current = Number(readVault().revision) || 0;
  if (current !== Number(since)) return Promise.resolve(current);
  return new Promise((resolve) => {
    const finish = (revision) => {
      clearTimeout(timer);
      listeners.delete(finish);
      resolve(revision);
    };
    const timer = setTimeout(() => finish(Number(readVault().revision) || 0), 20000);
    listeners.add(finish);
  });
}

function wake(revision) {
  const pending = [...listeners];
  listeners.clear();
  for (const finish of pending) finish(revision);
}

export function readVault() {
  if (!fs.existsSync(file)) return { revision: 0 };
  try {
    const mtime = fs.statSync(file).mtimeMs;
    if (cachedVault && cachedMtime === mtime) return cachedVault;
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (!parsed || typeof parsed !== 'object') return { revision: 0 };
    return remember(parsed, mtime);
  } catch {
    return { revision: 0 };
  }
}

export function commitVault(snapshot) {
  const current = readVault();
  const next = snapshot && typeof snapshot === 'object' ? { ...snapshot } : {};
  next.revision = (Number(current.revision) || 0) + 1;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(next));
  remember(next, fs.statSync(file).mtimeMs);
  wake(next.revision);
  syncVaultDebts(next).catch((error) => console.error('Debt copy failed:', error.message));
  return next;
}

export function writeVault(snapshot) {
  const current = readVault();
  const incomingRev = Number(snapshot?.revision) || 0;
  const currentRev = Number(current.revision) || 0;
  if (currentRev >= 1000000000 && incomingRev < 1000000000) return current;
  const merged = mergeVault(current, snapshot);
  const changed = vaultStamp(merged) !== vaultStamp(current);
  const base = Math.max(Number(current.revision) || 0, Number(snapshot?.revision) || 0);
  merged.revision = changed ? base + 1 : Number(current.revision) || 0;
  if (!changed) return { ...current, revision: merged.revision };
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(merged));
  remember(merged, fs.statSync(file).mtimeMs);
  wake(merged.revision);
  syncVaultDebts(merged).catch((error) => console.error('Debt copy failed:', error.message));
  return merged;
}
