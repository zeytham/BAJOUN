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

  merged.categories = union(list(left, 'categories'), list(right, 'categories'), (a, b) => ({ ...(a || {}), ...(b || {}) }));
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
  for (const row of [...list(left, 'meta'), ...list(right, 'meta')]) {
    if (!row.key || row.key === 'device_id' || row.key === 'vault_revision') continue;
    meta.set(row.key, { key: row.key, value: row.value });
  }
  const goneCategories = goneIds(list(left, 'meta'), list(right, 'meta'), 'gone_categories');
  goneCategories.delete('phones');
  const goneCustomers = goneIds(list(left, 'meta'), list(right, 'meta'), 'gone_customers');
  const newerCategories = new Set((preferRight ? list(right, 'categories') : list(left, 'categories')).map((row) => String(row.id)));
  const newerCustomers = new Set((preferRight ? list(right, 'customers') : list(left, 'customers')).map((row) => String(row.id)));
  for (const id of [...goneCategories]) {
    if (newerCategories.has(id)) goneCategories.delete(id);
  }
  for (const id of [...goneCustomers]) {
    if (newerCustomers.has(id)) goneCustomers.delete(id);
  }
  let needsOther = false;
  merged.products = merged.products.map((product) => {
    if (!goneCategories.has(String(product.category_id || ''))) return product;
    needsOther = true;
    return { ...product, category_id: 'nyingine' };
  });
  if (needsOther) goneCategories.delete('nyingine');
  merged.categories = merged.categories.filter((row) => String(row.id) === 'phones' || !goneCategories.has(String(row.id)));
  if (needsOther && !merged.categories.some((row) => String(row.id) === 'nyingine')) {
    merged.categories.push({ id: 'nyingine', name: 'Nyingine', slug: 'nyingine' });
  }
  merged.customers = merged.customers.filter((row) => !goneCustomers.has(String(row.id)));
  if (goneCategories.size) meta.set('gone_categories', { key: 'gone_categories', value: [...goneCategories].sort().join(',') });
  else meta.delete('gone_categories');
  if (goneCustomers.size) meta.set('gone_customers', { key: 'gone_customers', value: [...goneCustomers].sort().join(',') });
  else meta.delete('gone_customers');
  merged.meta = [...meta.values()];
  merged.revision = Math.max(num(left.revision), num(right.revision));
  return merged;
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
    pick('sales', ['id', 'paid', 'balance', 'voided', 'total']),
    pick('products', ['id', 'stock', 'price', 'name', 'active', 'category_id']),
    pick('phone_units', ['id', 'status']),
    pick('debts', ['id', 'balance', 'status']),
    pick('debt_payments', ['id', 'amount']),
    pick('sale_items', ['id', 'qty']),
    pick('stock_moves', ['id', 'delta']),
    pick('returns', ['id', 'total', 'refund']),
    pick('return_items', ['id', 'qty']),
    pick('customers', ['id', 'spent']),
    staffMark(snapshot),
    metaMark(snapshot, 'shop_logo'),
    pick('categories', ['id', 'name']),
    goneStamp(snapshot, 'gone_categories'),
    goneStamp(snapshot, 'gone_customers'),
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

function goneStamp(snapshot, key) {
  const row = list(snapshot, 'meta').find((item) => item.key === key);
  return String(row?.value || '').split(',').map((part) => part.trim()).filter(Boolean).sort().join(',');
}

export { tables };
