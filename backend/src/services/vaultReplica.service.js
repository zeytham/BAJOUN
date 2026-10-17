import fs from 'fs';
import path from 'path';
import { mergeVault, vaultStamp } from './vaultMerge.js';
import { syncVaultDebts } from './debt.service.js';

const file = path.resolve('data', 'vault-replica.json');

export function readVault() {
  if (!fs.existsSync(file)) return { revision: 0 };
  try {
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (!parsed || typeof parsed !== 'object') return { revision: 0 };
    return parsed;
  } catch {
    return { revision: 0 };
  }
}

export function writeVault(snapshot) {
  const current = readVault();
  const merged = mergeVault(current, snapshot);
  const changed = vaultStamp(merged) !== vaultStamp(current);
  const base = Math.max(Number(current.revision) || 0, Number(snapshot?.revision) || 0);
  merged.revision = changed ? base + 1 : Number(current.revision) || 0;
  if (!changed) return { ...current, revision: merged.revision };
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(merged));
  syncVaultDebts(merged).catch((error) => console.error('Debt copy failed:', error.message));
  return merged;
}
