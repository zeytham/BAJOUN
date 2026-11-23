const tables = [
  'categories',
  'products',
  'phone_units',
  'customers',
  'sales',
  'sale_items',
  'debts',
  'debt_payments',
  'returns',
  'return_items',
  'stock_moves',
  'staff',
  'notifications',
  'faults',
  'wings',
  'wing_items',
];

function list(snapshot, table) {
  const rows = snapshot?.[table];
  return Array.isArray(rows) ? rows.filter((row) => row && typeof row === 'object') : [];
}

function num(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function byId(rows) {
  const map = new Map();
  for (const row of rows) {
    if (row.id != null && row.id !== '') map.set(String(row.id), { ...row });
  }
  return map;
}

function union(leftRows, rightRows, combine) {
  const left = byId(leftRows);
  const right = byId(rightRows);
  const ids = new Set([...left.keys(), ...right.keys()]);
  return [...ids].map((id) => combine(left.get(id), right.get(id)));
}

function mergeSale(left, right) {
  if (!left) return { ...right };
  if (!right) return { ...left };
  const voided = num(left.voided) === 1 || num(right.voided) === 1;
  const total = num(left.total) || num(right.total);
  const paid = Math.max(num(left.paid), num(right.paid));
  const returned = Math.max(num(left.returned), num(right.returned));
  return {
    ...left,
    ...right,
    total,
    voided: voided ? 1 : 0,
    paid,
    balance: voided ? 0 : Math.max(0, total - returned - paid),
    change_due: Math.max(num(left.change_due), num(right.change_due)),
    returned,
  };
}

function mergePhone(left, right) {
  if (!left) return { ...right };
  if (!right) return { ...left };
  const sold = left.status === 'SOLD' || right.status === 'SOLD';
  return { ...left, ...right, status: sold ? 'SOLD' : right.status || left.status };
}

function phonesOnOpenSales(sales, items, returnItems) {
  const voided = new Set(sales.filter((sale) => num(sale.voided) === 1).map((sale) => String(sale.id)));
  const returned = new Set(returnItems.map((row) => String(row.sale_item_id)));
  const held = new Set();
  for (const item of items) {
    const phoneId = String(item.phone_id || '');
    if (!phoneId) continue;
    if (voided.has(String(item.sale_id))) continue;
    if (returned.has(String(item.id))) continue;
    held.add(phoneId);
  }
  return held;
}

function releasedPhoneStatus(leftRow, rightRow) {
  const statuses = [leftRow?.status, rightRow?.status];
  if (statuses.includes('FAULTY')) return 'FAULTY';
  if (statuses.includes('IN_STOCK')) return 'IN_STOCK';
  return 'IN_STOCK';
}

function mergeProduct(left, right, preferRight) {
  if (!left) return { ...right };
  if (!right) return { ...left };
  return preferRight ? { ...left, ...right, stock: left.stock } : { ...right, ...left };
}

function stockOf(name, baseRow, extraMoves, knownIds) {
  const extra = extraMoves
    .filter((move) => move.name === name && !knownIds.has(String(move.id)))
    .reduce((sum, move) => sum + num(move.delta), 0);
  return Math.max(0, num(baseRow?.stock) + extra);
}

export function mergeVault(current, incoming) {
  const left = current && typeof current === 'object' ? current : {};
  const right = incoming && typeof incoming === 'object' ? incoming : {};
  const preferRight = num(right.revision) >= num(left.revision);
  const merged = {};

  merged.categories = union(list(left, 'categories'), list(right, 'categories'), (a, b) => {
    const row = { ...(a || {}), ...(b || {}) };
    if (!b?.kind && a?.kind) row.kind = a.kind;
    if (!row.kind) row.kind = String(row.id) === 'phones' ? 'phone' : 'goods';
    return row;
  });
  merged.sale_items = union(list(left, 'sale_items'), list(right, 'sale_items'), (a, b) => ({ ...(a || {}), ...(b || {}) }));
  merged.stock_moves = union(list(left, 'stock_moves'), list(right, 'stock_moves'), (a, b) => ({ ...(a || {}), ...(b || {}) }));
  merged.debt_payments = union(list(left, 'debt_payments'), list(right, 'debt_payments'), (a, b) => ({ ...(a || {}), ...(b || {}) }));
  merged.returns = union(list(left, 'returns'), list(right, 'returns'), (a, b) => ({ ...(a || {}), ...(b || {}) }));
  merged.return_items = union(list(left, 'return_items'), list(right, 'return_items'), (a, b) => ({ ...(a || {}), ...(b || {}) }));
  merged.notifications = union(list(left, 'notifications'), list(right, 'notifications'), (a, b) => {
    if (!a) return { ...b };
    if (!b) return { ...a };
    return { ...a, ...b, read: num(a.read) === 1 || num(b.read) === 1 ? 1 : 0 };
  });
  merged.staff = union(list(left, 'staff'), list(right, 'staff'), (a, b) => {
    if (!a) return { ...b };
    if (!b) return { ...a };
    return preferRight ? { ...a, ...b } : { ...b, ...a };
  });
  merged.sales = union(list(left, 'sales'), list(right, 'sales'), mergeSale);
  merged.phone_units = union(list(left, 'phone_units'), list(right, 'phone_units'), mergePhone);
  const leftPhone = new Map(list(left, 'phone_units').map((row) => [String(row.id), row]));
  const rightPhone = new Map(list(right, 'phone_units').map((row) => [String(row.id), row]));
  const held = phonesOnOpenSales(merged.sales, merged.sale_items, merged.return_items);
  merged.phone_units = merged.phone_units.map((phone) => {
    const id = String(phone.id);
    if (held.has(id)) return { ...phone, status: 'SOLD' };
    if (phone.status !== 'SOLD') return phone;
    return { ...phone, status: releasedPhoneStatus(leftPhone.get(id), rightPhone.get(id)) };
  });
  merged.faults = union(list(left, 'faults'), list(right, 'faults'), (a, b) => ({ ...(a || {}), ...(b || {}) }));
  merged.wing_items = union(list(left, 'wing_items'), list(right, 'wing_items'), (a, b) => {
    if (!a) return { ...b, sold_qty: num(b.sold_qty), price: num(b.price), sale_id: b.sale_id || '' };
    if (!b) return { ...a, sold_qty: num(a.sold_qty), price: num(a.price), sale_id: a.sale_id || '' };
    const qty = Math.max(num(a.qty), num(b.qty));
    const back = Math.min(qty, Math.max(num(a.returned_qty), num(b.returned_qty)));
    const sold = Math.min(Math.max(0, qty - back), Math.max(num(a.sold_qty), num(b.sold_qty)));
    return { ...a, ...b, qty, returned_qty: back, sold_qty: sold, price: num(b.price) || num(a.price), sale_id: b.sale_id || a.sale_id || '' };
  });
  merged.wings = union(list(left, 'wings'), list(right, 'wings'), (a, b) => {
    if (!a) return { ...b };
    if (!b) return { ...a };
    const returned = String(a.returned_at || '') > String(b.returned_at || '') ? a.returned_at : b.returned_at;
    return { ...a, ...b, returned_at: returned || '' };
  });
  const loaned = new Set();
  for (const item of merged.wing_items) {
    if (item.phone_id && num(item.returned_qty) + num(item.sold_qty) < num(item.qty)) loaned.add(String(item.phone_id));
  }
  merged.phone_units = merged.phone_units.map((phone) => {
    if (phone.status === 'SOLD') return phone;
    if (loaned.has(String(phone.id))) return { ...phone, status: 'WING' };
    if (phone.status === 'WING') return { ...phone, status: 'IN_STOCK' };
    return phone;
  });

  const leftMoves = list(left, 'stock_moves');
  const rightMoves = list(right, 'stock_moves');
  const leftMoveIds = new Set(leftMoves.map((move) => String(move.id)));
  const rightMoveIds = new Set(rightMoves.map((move) => String(move.id)));
  merged.products = union(list(left, 'products'), list(right, 'products'), (a, b) => {
    const row = mergeProduct(a, b, preferRight);
    const name = row.name;
    if (a && b) {
      row.stock = preferRight
        ? stockOf(name, b, leftMoves, rightMoveIds)
        : stockOf(name, a, rightMoves, leftMoveIds);
    }
    return row;
  });

  const paidByDebt = new Map();
  for (const payment of merged.debt_payments) {
    const id = String(payment.debt_id);
    paidByDebt.set(id, (paidByDebt.get(id) || 0) + num(payment.amount));
  }
  const reliefBySale = new Map();
  for (const row of merged.returns) {
    const id = String(row.sale_id || '');
    reliefBySale.set(id, (reliefBySale.get(id) || 0) + Math.max(0, num(row.total) - num(row.refund)));
  }
  merged.debts = union(list(left, 'debts'), list(right, 'debts'), (a, b) => {
    if (!a) return { ...b };
    if (!b) return { ...a };
    if (a.status === 'VOID' || b.status === 'VOID') return { ...a, ...b, status: 'VOID', balance: 0 };
    const reminded = String(a.last_reminded || '') > String(b.last_reminded || '') ? a.last_reminded : b.last_reminded;
    return { ...a, ...b, principal: Math.max(num(a.principal), num(b.principal)), last_reminded: reminded || '' };
  }).map((debt) => {
    if (debt.status === 'VOID') return debt;
    const balance = Math.max(0, num(debt.principal) - (paidByDebt.get(String(debt.id)) || 0) - (reliefBySale.get(String(debt.sale_id)) || 0));
    return { ...debt, balance, status: balance <= 0.5 ? 'PAID' : 'OPEN' };
  });

  const debtBySale = new Map(merged.debts.filter((debt) => debt.status !== 'VOID').map((debt) => [String(debt.sale_id), debt]));
  merged.sales = merged.sales.map((sale) => {
    if (num(sale.voided) === 1) return { ...sale, balance: 0 };
    const debt = debtBySale.get(String(sale.id));
    if (!debt) return sale;
    const balance = num(debt.balance);
    return { ...sale, balance };
  });
  for (const wing of merged.wings) {
    const items = merged.wing_items.filter((item) => String(item.wing_id) === String(wing.id));
    if (!items.length) continue;
    const open = items.some((item) => {
      if (num(item.qty) - num(item.returned_qty) - num(item.sold_qty) > 0) return true;
      if (num(item.sold_qty) <= 0) return false;
      const sale = merged.sales.find((row) => String(row.id) === String(item.sale_id || ''));
      return Boolean(sale) && num(sale.voided) !== 1 && num(sale.balance) > 0.5;
    });
    wing.status = open ? 'OUT' : 'BACK';
    if (!open && !wing.returned_at) wing.returned_at = new Date().toISOString();
  }

  const spent = new Map();
  for (const sale of merged.sales) {
    if (num(sale.voided) === 1) continue;
    const phone = String(sale.customer_phone || '').replace(/\D/g, '');
    const key = phone.length >= 9 ? phone : `name:${sale.customer_name}`;
    spent.set(key, (spent.get(key) || 0) + num(sale.total));
  }
  const saleById = new Map(merged.sales.map((sale) => [String(sale.id), sale]));
  for (const row of merged.returns) {
    const sale = saleById.get(String(row.sale_id));
    if (!sale || num(sale.voided) === 1) continue;
    const phone = String(sale.customer_phone || '').replace(/\D/g, '');
    const key = phone.length >= 9 ? phone : `name:${sale.customer_name}`;
    spent.set(key, Math.max(0, (spent.get(key) || 0) - num(row.total)));
  }
  merged.customers = union(list(left, 'customers'), list(right, 'customers'), (a, b) => ({ ...(a || {}), ...(b || {}) })).map((customer) => {
    const phone = String(customer.phone || '').replace(/\D/g, '');
    const key = phone.length >= 9 ? phone : `name:${customer.name}`;
    return { ...customer, spent: spent.get(key) || num(customer.spent) };
  });

  const meta = new Map();
  const deviceKeys = new Set(['device_id', 'vault_revision', 'cloud_url', 'sync_token', 'cloud_url__at', 'sync_token__at']);
  const timedKeys = new Set();
  for (const row of [...list(left, 'meta'), ...list(right, 'meta')]) {
    if (!row.key || deviceKeys.has(row.key) || String(row.key).endsWith('__at')) continue;
    if (row.key === 'gone_categories' || row.key === 'gone_customers' || row.key === 'gone_products') continue;
    timedKeys.add(row.key);
  }
  for (const key of timedKeys) {
    const leftRow = list(left, 'meta').find((item) => item.key === key);
    const rightRow = list(right, 'meta').find((item) => item.key === key);
    const keepFilled = new Set(['shop_name', 'shop_location', 'shop_phone', 'receipt_footer', 'lipa_namba', 'shop_logo']);
    const leftEmpty = !String(leftRow?.value || '').trim();
    const rightEmpty = !String(rightRow?.value || '').trim();
    let useRight = metaTime(right, key) >= metaTime(left, key);
    if (keepFilled.has(key) && leftEmpty !== rightEmpty) {
      const emptyOnRight = rightEmpty;
      const emptyTime = emptyOnRight ? metaTime(right, key) : metaTime(left, key);
      const filledTime = emptyOnRight ? metaTime(left, key) : metaTime(right, key);
      const emptyWins = emptyTime > filledTime && emptyTime > 0;
      useRight = emptyOnRight ? emptyWins : !emptyWins;
    }
    const chosen = useRight ? rightRow || leftRow : leftRow || rightRow;
    if (!chosen) continue;
    meta.set(key, { key, value: chosen.value });
    const at = useRight ? metaTime(right, key) : metaTime(left, key);
    if (at) meta.set(`${key}__at`, { key: `${key}__at`, value: new Date(at).toISOString() });
  }
  const goneProducts = goneIds(list(left, 'meta'), list(right, 'meta'), 'gone_products');
  const productNewerRight = metaTime(right, 'gone_products') >= metaTime(left, 'gone_products');
  dropRevived(goneProducts, left, right, 'products', 'gone_products', productNewerRight);
  merged.products = merged.products.filter((row) => !goneProducts.has(String(row.id)));
  if (goneProducts.size) meta.set('gone_products', { key: 'gone_products', value: [...goneProducts].sort().join(',') });
  else meta.delete('gone_products');
  const goneCategories = goneIds(list(left, 'meta'), list(right, 'meta'), 'gone_categories');
  goneCategories.delete('phones');
  const goneCustomers = goneIds(list(left, 'meta'), list(right, 'meta'), 'gone_customers');
  const categoryNewerRight = metaTime(right, 'gone_categories') >= metaTime(left, 'gone_categories');
  const customerNewerRight = metaTime(right, 'gone_customers') >= metaTime(left, 'gone_customers');
  dropRevived(goneCategories, left, right, 'categories', 'gone_categories', categoryNewerRight);
  dropRevived(goneCustomers, left, right, 'customers', 'gone_customers', customerNewerRight);
  let needsOther = false;
  merged.products = merged.products.map((product) => {
    if (!goneCategories.has(String(product.category_id || ''))) return product;
    needsOther = true;
    return { ...product, category_id: 'nyingine' };
  });
  if (needsOther) goneCategories.delete('nyingine');
  merged.categories = merged.categories.filter((row) => String(row.id) === 'phones' || !goneCategories.has(String(row.id)));
  if (needsOther && !merged.categories.some((row) => String(row.id) === 'nyingine')) {
    merged.categories.push({ id: 'nyingine', name: 'Nyingine', slug: 'nyingine', kind: 'goods' });
  }
  merged.customers = merged.customers.filter((row) => !goneCustomers.has(String(row.id)));
  if (goneCategories.size) meta.set('gone_categories', { key: 'gone_categories', value: [...goneCategories].sort().join(',') });
  else meta.delete('gone_categories');
  if (goneCustomers.size) meta.set('gone_customers', { key: 'gone_customers', value: [...goneCustomers].sort().join(',') });
  else meta.delete('gone_customers');
  const leftHidden = goneIds(list(left, 'meta'), [], 'debts_hidden');
  const rightHidden = goneIds(list(right, 'meta'), [], 'debts_hidden');
  const leftHideAt = metaTime(left, 'debts_hidden');
  const rightHideAt = metaTime(right, 'debts_hidden');
  const newerHidden = rightHideAt >= leftHideAt ? rightHidden : leftHidden;
  const cleared = newerHidden.size === 0 && Math.max(leftHideAt, rightHideAt) > 0;
  const hiddenDebts = cleared ? [] : [...new Set([...leftHidden, ...rightHidden])].sort();
  meta.set('debts_hidden', { key: 'debts_hidden', value: hiddenDebts.join(',') });
  const hideAt = Math.max(leftHideAt, rightHideAt);
  if (hideAt) meta.set('debts_hidden__at', { key: 'debts_hidden__at', value: new Date(hideAt).toISOString() });
  settleInvoices(merged.sales);
  merged.meta = [...meta.values()];
  merged.revision = Math.max(num(left.revision), num(right.revision));
  return merged;
}

function metaTime(snapshot, key) {
  const row = list(snapshot, 'meta').find((item) => item.key === `${key}__at`);
  const parsed = Date.parse(row?.value || '');
  return Number.isFinite(parsed) ? parsed : 0;
}

function dropRevived(gone, left, right, table, key, newerRight) {
  const newerRows = newerRight ? list(right, table) : list(left, table);
  const newerMeta = newerRight ? list(right, 'meta') : list(left, 'meta');
  const olderAt = metaTime(newerRight ? left : right, key);
  const newerAt = metaTime(newerRight ? right : left, key);
  const newerIds = new Set(newerRows.map((row) => String(row.id)));
  const newerGone = goneIds(newerMeta, [], key);
  for (const id of [...gone]) {
    if (newerIds.has(id) && !newerGone.has(id) && newerAt > olderAt) gone.delete(id);
  }
}

function goneIds(leftRows, rightRows, key) {
  const ids = new Set();
  for (const rows of [leftRows, rightRows]) {
    const row = rows.find((item) => item.key === key);
    for (const part of String(row?.value || '').split(',')) {
      const id = part.trim();
      if (id) ids.add(id);
    }
  }
  return ids;
}

export function vaultStamp(snapshot) {
  const pick = (table, fields) => list(snapshot, table)
    .map((row) => fields.map((field) => row?.[field] ?? '').join('|'))
    .sort()
    .join('\n');
  return [
    pick('sales', ['id', 'invoice', 'paid', 'balance', 'voided', 'total']),
    pick('products', ['id', 'stock', 'price', 'name', 'active', 'category_id', 'fault_qty', 'warranty_days']),
    pick('phone_units', ['id', 'status', 'warranty_days']),
    pick('debts', ['id', 'balance', 'status', 'due_at', 'term_days']),
    pick('faults', ['id', 'qty', 'cost']),
    pick('wings', ['id', 'status', 'returned_at']),
    pick('wing_items', ['id', 'qty', 'returned_qty']),
    pick('debt_payments', ['id', 'amount']),
    pick('sale_items', ['id', 'qty']),
    pick('stock_moves', ['id', 'delta']),
    pick('returns', ['id', 'total', 'refund']),
    pick('return_items', ['id', 'qty']),
    pick('customers', ['id', 'spent']),
    staffMark(snapshot),
    metaMark(snapshot, 'shop_logo'),
    pick('categories', ['id', 'name', 'kind']),
    goneStamp(snapshot, 'gone_products'),
    goneStamp(snapshot, 'gone_categories'),
    goneStamp(snapshot, 'gone_customers'),
    goneStamp(snapshot, 'debts_hidden'),
  ].join('\n#\n');
}

function staffMark(snapshot) {
  return list(snapshot, 'staff').map((row) => {
    const photo = String(row?.photo || '');
    return [row?.id ?? '', row?.pin_hash ?? '', row?.active ?? '', `${photo.length}:${photo.slice(0, 24)}`].join('|');
  }).sort().join('\n');
}

function metaMark(snapshot, key) {
  const row = list(snapshot, 'meta').find((item) => item.key === key);
  const value = String(row?.value || '');
  return `${value.length}:${value.slice(0, 24)}`;
}

function settleInvoices(sales) {
  const used = new Set();
  const ordered = [...sales].sort((a, b) => String(a.created_at || '').localeCompare(String(b.created_at || '')) || String(a.id).localeCompare(String(b.id)));
  for (const sale of ordered) {
    let invoice = String(sale.invoice || '');
    if (invoice && !used.has(invoice)) {
      used.add(invoice);
      continue;
    }
    const year = new Date(sale.created_at || Date.now()).getFullYear();
    let n = sales.length;
    let next = '';
    do {
      n += 1;
      next = `INV-${Number.isFinite(year) ? year : new Date().getFullYear()}-${String(n).padStart(4, '0')}`;
    } while (used.has(next));
    sale.invoice = next;
    used.add(next);
  }
}

function goneStamp(snapshot, key) {
  const row = list(snapshot, 'meta').find((item) => item.key === key);
  return String(row?.value || '').split(',').map((part) => part.trim()).filter(Boolean).sort().join(',');
}

export { tables };
