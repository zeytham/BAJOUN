import { all, getDb, metaGet, metaSet, persist } from './db.js';

const CATALOG_KEY = 'catalog';

export function deviceId() {
  let id = localStorage.getItem('phonevault_device_id');
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem('phonevault_device_id', id);
  }
  return id;
}

export async function sha256(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`phonevault-till:${text}`));
  return [...new Uint8Array(buf)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function readCatalog(db) {
  const row = all(db, 'SELECT json FROM catalog_blob WHERE key = ?', [CATALOG_KEY])[0];
  if (!row) return null;
  try {
    return JSON.parse(row.json);
  } catch {
    return null;
  }
}

function writeCatalog(db, catalog) {
  db.run(
    'INSERT INTO catalog_blob (key, json) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET json = excluded.json',
    [CATALOG_KEY, JSON.stringify(catalog)],
  );
}

function pendingCount(db) {
  return all(db, "SELECT COUNT(*) AS n FROM outbox WHERE status = 'PENDING'")[0]?.n || 0;
}

export async function loadWorkingCatalog() {
  const db = await getDb();
  return readCatalog(db);
}

export async function noteServerCatalog(catalog) {
  const db = await getDb();
  if (pendingCount(db) > 0) return readCatalog(db);
  const next = { ...catalog, savedAt: new Date().toISOString() };
  writeCatalog(db, next);
  await persist(db);
  return next;
}

function applyStock(catalog, items, isProforma) {
  if (!catalog || isProforma) return catalog;
  const next = structuredClone(catalog);
  for (const item of items) {
    if (item.phoneUnitId) {
      const unit = (next.phoneUnits || []).find((row) => row.id === item.phoneUnitId);
      if (unit) unit.status = 'SOLD';
    } else if (item.variantId) {
      for (const product of next.products || []) {
        const variant = product.variants?.find((row) => row.id === item.variantId);
        if (variant) variant.stockQuantity = Math.max(0, (variant.stockQuantity || 0) - item.quantity);
      }
    } else if (item.productId) {
      const product = (next.products || []).find((row) => row.id === item.productId);
      if (product && !product.hasVariants) {
        product.stockQuantity = Math.max(0, (product.stockQuantity || 0) - item.quantity);
      }
    }
  }
  next.savedAt = new Date().toISOString();
  return next;
}

function buildReceipt(payload, cart) {
  return {
    id: payload.clientSaleId,
    invoiceNumber: payload.invoiceNumber,
    grandTotal: payload.grandTotal,
    amountPaid: payload.amountPaid,
    changeDue: payload.changeDue,
    createdAt: new Date().toISOString(),
    items: (cart || []).map((item) => ({
      id: item.cartId,
      lineTotal: (Number(item.unitPrice) - Number(item.discount || 0)) * Number(item.quantity || 1),
      product: { name: item.productName },
      phoneUnit: item.imei1 ? { imei1: item.imei1, warrantyMonths: item.warrantyMonths || 12 } : null,
    })),
  };
}

async function postSale(payload) {
  const response = await fetch('/api/pos/sales', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok || json.error) {
    const error = new Error(json.message || 'Sale was rejected by the shop server');
    error.permanent = response.status >= 400 && response.status < 500 && response.status !== 408;
    throw error;
  }
  return json;
}

async function pushRow(db, row) {
  const payload = JSON.parse(row.payload);
  try {
    await postSale(payload);
    const now = new Date().toISOString();
    db.run("UPDATE outbox SET status = 'SYNCED', synced_at = ?, last_error = NULL WHERE id = ?", [now, row.id]);
    db.run("UPDATE local_sales SET status = 'SYNCED' WHERE id = ?", [row.id]);
    return 'SYNCED';
  } catch (error) {
    const status = error.permanent ? 'CONFLICT' : 'PENDING';
    if (status === 'CONFLICT') {
      const catalog = readCatalog(db);
      if (catalog) writeCatalog(db, revertStock(catalog, payload.items, payload.isProforma));
      db.run("UPDATE local_sales SET status = 'CONFLICT' WHERE id = ?", [row.id]);
    }
    db.run(
      'UPDATE outbox SET status = ?, attempts = attempts + 1, last_error = ? WHERE id = ?',
      [status, String(error.message || error).slice(0, 300), row.id],
    );
    return status;
  }
}

function revertStock(catalog, items, isProforma) {
  if (!catalog || isProforma) return catalog;
  const next = structuredClone(catalog);
  for (const item of items || []) {
    if (item.phoneUnitId) {
      const unit = (next.phoneUnits || []).find((row) => row.id === item.phoneUnitId);
      if (unit && unit.status === 'SOLD') unit.status = 'IN_STOCK';
    } else if (item.variantId) {
      for (const product of next.products || []) {
        const variant = product.variants?.find((row) => row.id === item.variantId);
        if (variant) variant.stockQuantity = (variant.stockQuantity || 0) + item.quantity;
      }
    } else if (item.productId) {
      const product = (next.products || []).find((row) => row.id === item.productId);
      if (product && !product.hasVariants) product.stockQuantity = (product.stockQuantity || 0) + item.quantity;
    }
  }
  return next;
}

export async function flushOutbox() {
  const db = await getDb();
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return { synced: 0, pending: pendingCount(db), conflicts: conflictCount(db) };
  }
  const rows = all(db, "SELECT * FROM outbox WHERE status = 'PENDING' ORDER BY created_at ASC");
  let synced = 0;
  for (const row of rows) {
    const result = await pushRow(db, row);
    if (result === 'SYNCED') synced += 1;
  }
  if (rows.length) await persist(db);
  if (synced) {
    metaSet(db, 'last_sync_at', new Date().toISOString());
    await persist(db);
  }
  return { synced, pending: pendingCount(db), conflicts: conflictCount(db) };
}

function conflictCount(db) {
  return all(db, "SELECT COUNT(*) AS n FROM outbox WHERE status = 'CONFLICT'")[0]?.n || 0;
}

export async function commitSale({ body, cart, grandTotal, amountPaid, changeDue }) {
  const db = await getDb();
  const clientSaleId = crypto.randomUUID();
  const invoiceNumber = `INV-${new Date().getFullYear()}-D${Date.now().toString().slice(-8)}`;
  const payload = {
    ...body,
    clientSaleId,
    invoiceNumber,
    deviceId: deviceId(),
  };
  const catalog = applyStock(readCatalog(db), payload.items, payload.isProforma);
  if (catalog) writeCatalog(db, catalog);

  const receipt = buildReceipt({ ...payload, grandTotal, amountPaid, changeDue }, cart);
  const now = new Date().toISOString();
  db.run(
    'INSERT INTO local_sales (id, invoice_number, payload, status, created_at) VALUES (?, ?, ?, ?, ?)',
    [clientSaleId, invoiceNumber, JSON.stringify(receipt), 'PENDING', now],
  );
  db.run(
    'INSERT INTO outbox (id, kind, payload, status, attempts, created_at) VALUES (?, ?, ?, ?, 0, ?)',
    [clientSaleId, 'SALE', JSON.stringify(payload), 'PENDING', now],
  );
  await persist(db);

  let queued = true;
  if (typeof navigator === 'undefined' || navigator.onLine !== false) {
    const row = all(db, 'SELECT * FROM outbox WHERE id = ?', [clientSaleId])[0];
    const result = await pushRow(db, row);
    queued = result !== 'SYNCED';
    if (result === 'SYNCED') metaSet(db, 'last_sync_at', new Date().toISOString());
    await persist(db);
  }

  return {
    success: true,
    data: { ...receipt, queuedOffline: queued },
    catalog,
    queued,
  };
}

export async function continuityStatus() {
  const db = await getDb();
  const sales = all(db, 'SELECT COUNT(*) AS n FROM local_sales')[0]?.n || 0;
  return {
    deviceId: deviceId(),
    pending: pendingCount(db),
    conflicts: conflictCount(db),
    localSales: sales,
    lastSyncAt: metaGet(db, 'last_sync_at'),
    catalogSavedAt: readCatalog(db)?.savedAt || null,
    apiBase: localStorage.getItem('phonevault_api_base') || '',
    online: typeof navigator === 'undefined' ? true : navigator.onLine,
    ownerReady: Boolean(metaGet(db, 'owner_pin_hash')),
  };
}

export async function hasOwnerPin() {
  const db = await getDb();
  return Boolean(metaGet(db, 'owner_pin_hash'));
}

export async function setOwnerPin(name, pin) {
  if (!/^\d{4}$/.test(pin)) throw new Error('PIN lazima iwe tarakimu 4');
  const db = await getDb();
  metaSet(db, 'owner_pin_hash', await sha256(pin));
  metaSet(db, 'owner_name', name || 'Mmiliki');
  await persist(db);
}

export async function verifyOwnerPin(pin) {
  const db = await getDb();
  const saved = metaGet(db, 'owner_pin_hash');
  if (!saved) return null;
  if ((await sha256(pin)) !== saved) return false;
  return {
    id: 'local-owner',
    name: metaGet(db, 'owner_name') || 'Mmiliki',
    email: 'owner@duka.local',
    role: 'ADMIN',
    offline: true,
  };
}

export async function setOfflineManagerPin(pin) {
  if (!/^\d{4}$/.test(pin)) throw new Error('PIN lazima iwe tarakimu 4');
  const db = await getDb();
  metaSet(db, 'manager_pin_hash', await sha256(pin));
  await persist(db);
}

export async function verifyOfflineManagerPin(pin) {
  const db = await getDb();
  const saved = metaGet(db, 'manager_pin_hash');
  if (!saved) return false;
  return (await sha256(pin)) === saved;
}

export async function exportLocalSalesCsv() {
  const db = await getDb();
  const rows = all(db, 'SELECT invoice_number, payload, status, created_at FROM local_sales ORDER BY created_at ASC');
  const header = ['invoice', 'date', 'status', 'total', 'paid', 'change', 'items'];
  const lines = [header.join(',')];
  for (const row of rows) {
    const sale = JSON.parse(row.payload);
    const items = (sale.items || []).map((item) => {
      const imei = item.phoneUnit?.imei1 ? ` IMEI ${item.phoneUnit.imei1}` : '';
      return `${item.product?.name || 'Item'}${imei}`;
    }).join(' | ');
    const cells = [row.invoice_number, row.created_at, row.status, sale.grandTotal, sale.amountPaid, sale.changeDue, items];
    lines.push(cells.map((value) => {
      const text = value == null ? '' : String(value);
      return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
    }).join(','));
  }
  return `\uFEFF${lines.join('\n')}\n`;
}

export function downloadText(filename, text, type = 'text/csv;charset=utf-8') {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
