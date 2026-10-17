import initSqlJs from 'sql.js';
import wasmUrl from 'sql.js/dist/sql-wasm.wasm?url';

const IDB_NAME = 'phonevault-pos';
const IDB_STORE = 'sqlite';
const IDB_KEY = 'shop';

const SCHEMA = `
CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT);
CREATE TABLE IF NOT EXISTS catalog_blob (key TEXT PRIMARY KEY, json TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS outbox (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL,
  payload TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING',
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  created_at TEXT NOT NULL,
  synced_at TEXT
);
CREATE TABLE IF NOT EXISTS local_sales (
  id TEXT PRIMARY KEY,
  invoice_number TEXT,
  payload TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL
);
`;

let dbPromise;

function openIdb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(IDB_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(IDB_STORE)) {
        request.result.createObjectStore(IDB_STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function idbGet() {
  return openIdb().then((idb) => new Promise((resolve, reject) => {
    const tx = idb.transaction(IDB_STORE, 'readonly');
    const request = tx.objectStore(IDB_STORE).get(IDB_KEY);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  }));
}

function idbSet(bytes) {
  return openIdb().then((idb) => new Promise((resolve, reject) => {
    const tx = idb.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).put(bytes, IDB_KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  }));
}

export async function getDb() {
  if (!dbPromise) dbPromise = openDb();
  return dbPromise;
}

async function openDb() {
  const SQL = await initSqlJs({ locateFile: () => wasmUrl });
  const saved = await idbGet();
  const db = saved ? new SQL.Database(new Uint8Array(saved)) : new SQL.Database();
  db.run(SCHEMA);
  return db;
}

export async function persist(db) {
  const bytes = db.export();
  await idbSet(bytes);
}

export function all(db, sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}

export function metaGet(db, key) {
  return all(db, 'SELECT value FROM meta WHERE key = ?', [key])[0]?.value ?? null;
}

export function metaSet(db, key, value) {
  db.run(
    'INSERT INTO meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
    [key, value],
  );
}
