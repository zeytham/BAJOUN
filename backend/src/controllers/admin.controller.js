import { createHash, randomBytes, timingSafeEqual } from 'crypto';
import ExcelJS from 'exceljs';
import jwt from 'jsonwebtoken';
import { tokenSecret } from '../middleware/auth.js';
import { commitVault, readVault } from '../services/vaultReplica.service.js';

function tokenOk(token) {
  const expected = process.env.SYNC_TOKEN || '';
  const left = Buffer.from(String(token || ''));
  const right = Buffer.from(expected);
  if (!expected || left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

function sameShop(url, req) {
  const host = url.hostname.toLowerCase();
  const mine = String(req.hostname || '').toLowerCase();
  const railway = String(process.env.RAILWAY_PUBLIC_DOMAIN || '').toLowerCase();
  return host === mine || host === 'localhost' || host === '127.0.0.1' || (railway && host === railway);
}

export function shopTarget(req) {
  if (req.get('x-shop-mode') !== 'remote') return { mode: 'local' };
  const base = String(req.get('x-shop-base') || '').trim().replace(/\/$/, '');
  const token = String(req.get('x-shop-token') || '').trim();
  let url;
  try { url = new URL(base); } catch { return { error: 'Anwani ya duka si sahihi.' }; }
  const local = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && local)) return { error: 'Anwani ya duka iwe https.' };
  if (!token) return { error: 'Weka neno la siri la duka.' };
  if (sameShop(url, req)) {
    if (!tokenOk(token)) return { error: 'Neno la siri si sahihi.' };
    return { mode: 'local' };
  }
  return { mode: 'remote', base: url.origin, token };
}

export async function vaultFrom(req) {
  const target = shopTarget(req);
  if (target.error) return target;
  if (target.mode === 'local') return { vault: readVault(), target };
  const response = await fetch(`${target.base}/api/sync/vault`, { headers: { 'x-sync-token': target.token } });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || !body.success) return { error: 'Duka halikufunguka. Angalia anwani na ufunguo.' };
  return { vault: body.data || {}, target };
}

export async function keepVault(req, target, snapshot) {
  if (target.mode === 'local') {
    commitVault(snapshot);
    return '';
  }
  const response = await fetch(`${target.base}/api/sync/vault`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json', 'x-sync-token': target.token },
    body: JSON.stringify({ snapshot }),
  });
  if (!response.ok) return 'Duka halikuhifadhi mabadiliko.';
  return '';
}

export function rows(vault, name) {
  return Array.isArray(vault?.[name]) ? vault[name] : [];
}

export function num(value) {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : 0;
}

function rangeOf(query) {
  const now = new Date();
  const end = query.end ? new Date(query.end) : now;
  const start = query.start ? new Date(query.start) : new Date(end.getFullYear(), end.getMonth(), end.getDate());
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) return null;
  if (query.end && String(query.end).length <= 10) end.setHours(23, 59, 59, 999);
  return { start: start.getTime(), end: end.getTime() };
}

function stamp(value) {
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? null : time;
}

function inside(value, range) {
  const time = stamp(value);
  return time != null && time >= range.start && time <= range.end;
}

const shopMemos = new Map();

export async function getPhoneVaultShop(req, res) {
  try {
    const range = rangeOf(req.query);
    if (!range) return res.status(400).json({ error: true, message: 'Tarehe si sahihi.' });
    const loaded = await vaultFrom(req);
    if (loaded.error) return res.status(400).json({ error: true, message: loaded.error });
    const vault = loaded.vault;
    const viewer = staffSession(req, vault);
    if (viewer?.error) return res.status(401).json({ error: true, message: viewer.error });
    const memoKey = `${loaded.target.mode}|${loaded.target.base || ''}|${num(vault.revision)}|${range.start}|${range.end}|${viewer ? viewer.id : 'desk'}`;
    const sameRange = req.get('x-shop-start') === String(req.query.start || '') && req.get('x-shop-end') === String(req.query.end || '');
    if (sameRange && req.get('x-vault-revision') && Number(req.get('x-vault-revision')) === num(vault.revision)) {
      return res.json({ success: true, unchanged: true, revision: num(vault.revision) });
    }
    const remembered = shopMemos.get(memoKey);
    if (remembered) return res.json(remembered);
    const linked = Array.isArray(vault.products) || Array.isArray(vault.sales);

    const sales = rows(vault, 'sales');
    const items = rows(vault, 'sale_items');
    const debts = rows(vault, 'debts');
    const payments = rows(vault, 'debt_payments');
    const returns = rows(vault, 'returns');
    const products = rows(vault, 'products');
    const phones = rows(vault, 'phone_units');
    const customers = rows(vault, 'customers');
    const wings = rows(vault, 'wings');
    const wingItems = rows(vault, 'wing_items');
    const faults = rows(vault, 'faults');
    const notes = rows(vault, 'notifications');
    const moves = rows(vault, 'stock_moves');

    const saleOfDebt = new Map();
    for (const debt of debts) saleOfDebt.set(String(debt.id), String(debt.sale_id || ''));
    const later = new Map();
    for (const pay of payments) {
      const saleId = saleOfDebt.get(String(pay.debt_id));
      if (!saleId) continue;
      later.set(saleId, (later.get(saleId) || 0) + num(pay.amount));
    }
    const itemsOf = new Map();
    for (const item of items) {
      const key = String(item.sale_id);
      if (!itemsOf.has(key)) itemsOf.set(key, []);
      itemsOf.get(key).push(item);
    }

    const returnedQty = new Map();
    for (const row of rows(vault, 'return_items')) {
      const id = String(row.sale_item_id);
      returnedQty.set(id, (returnedQty.get(id) || 0) + num(row.qty));
    }

    const visible = sales.filter((sale) => num(sale.voided) === 0);
    const visibleIds = new Set(visible.map((sale) => String(sale.id)));

    let billed = 0;
    let cashSales = 0;
    let lipaSales = 0;
    let changeOut = 0;
    let receipts = 0;
    let cost = 0;
    const ledger = [];
    for (const sale of visible) {
      if (!inside(sale.created_at, range)) continue;
      receipts += 1;
      billed += num(sale.total);
      changeOut += num(sale.change_due);
      const taken = Math.max(0, num(sale.paid) - (later.get(String(sale.id)) || 0));
      if (sale.method === 'CASH') cashSales += taken;
      if (sale.method === 'LIPA') lipaSales += taken;
      const lines = itemsOf.get(String(sale.id)) || [];
      for (const line of lines) cost += num(line.cost) * num(line.qty);
      ledger.push({
        id: sale.id,
        invoice: sale.invoice,
        customer: sale.customer_name,
        phone: sale.customer_phone,
        total: num(sale.total),
        paid: num(sale.paid),
        balance: num(sale.balance),
        change: num(sale.change_due),
        method: sale.method,
        lipaRef: sale.lipa_ref || '',
        cashier: sale.cashier_name,
        cashierId: sale.cashier_id || '',
        at: sale.created_at,
        items: lines.map((line) => ({
          id: line.id,
          qty: num(line.qty),
          back: returnedQty.get(String(line.id)) || 0,
          name: line.name,
          imei: line.imei || '',
          price: num(line.price),
          cost: num(line.cost),
          productId: line.product_id || '',
          phoneId: line.phone_id || '',
          faulty: num(line.faulty) === 1,
          total: num(line.price) * num(line.qty),
          warrantyDays: num(line.warranty_days) || num(line.warranty_months) * 30,
        })),
      });
    }
    ledger.sort((a, b) => String(b.at).localeCompare(String(a.at)));

    let cashDebts = 0;
    let lipaDebts = 0;
    for (const pay of payments) {
      const saleId = saleOfDebt.get(String(pay.debt_id));
      if (!saleId || !visibleIds.has(saleId) || !inside(pay.created_at, range)) continue;
      if (pay.method === 'CASH') cashDebts += num(pay.amount);
      if (pay.method === 'LIPA') lipaDebts += num(pay.amount);
    }

    let refunds = 0;
    const returnRows = [];
    for (const row of returns) {
      if (!visibleIds.has(String(row.sale_id)) || !inside(row.created_at, range)) continue;
      const refund = num(row.refund);
      const sale = visible.find((item) => String(item.id) === String(row.sale_id));
      if (refund > 0 && (sale?.method === 'CASH' || sale?.method === 'LIPA')) refunds += refund;
      returnRows.push({
        id: row.id,
        saleId: row.sale_id,
        invoice: row.invoice,
        saleInvoice: row.sale_invoice,
        customer: sale?.customer_name || '',
        phone: sale?.customer_phone || '',
        reason: row.reason,
        total: num(row.total),
        refund,
        at: row.created_at,
      });
    }

    const debtBook = debts
      .filter((debt) => ['OPEN', 'PAID'].includes(String(debt.status)) && visibleIds.has(String(debt.sale_id)))
      .map((debt) => ({
        id: debt.id,
        customer: debt.customer_name,
        phone: debt.customer_phone,
        principal: num(debt.principal),
        balance: num(debt.balance),
        status: debt.status,
        due: debt.due_at || '',
        reminded: debt.last_reminded || '',
        at: debt.opened_at,
        payments: payments
          .filter((pay) => String(pay.debt_id) === String(debt.id))
          .map((pay) => ({ amount: num(pay.amount), method: pay.method, at: pay.created_at })),
      }));
    const openDebts = debtBook.filter((debt) => debt.status === 'OPEN');

    const stock = products
      .filter((product) => num(product.active) !== 0)
      .map((product) => ({
        id: product.id,
        name: product.name,
        type: product.type,
        price: num(product.price),
        cost: num(product.cost),
        stock: num(product.stock),
        reorder: num(product.reorder_level),
        fault: num(product.fault_qty),
        storage: product.storage || '',
        ram: product.ram || '',
        condition: product.condition || '',
        warrantyDays: num(product.warranty_days) || num(product.warranty_months) * 30,
        barcode: product.barcode || '',
        categoryId: product.category_id || '',
        color: product.color || '',
        brand: product.brand || '',
        size: product.size || '',
        screen: product.screen || '',
      }));

    const units = phones.map((phone) => ({
      id: phone.id,
      name: phone.product_name,
      imei: phone.imei,
      color: phone.color || '',
      storage: phone.storage || '',
      ram: phone.ram || '',
      screen: phone.screen || '',
      condition: phone.condition || '',
      status: phone.status,
      price: num(phone.price),
      cost: num(phone.cost),
      floor: num(phone.floor_price) || num(phone.price),
      warrantyDays: num(phone.warranty_days) || num(phone.warranty_months) * 30,
      categoryId: phone.category_id || '',
    }));

    const goodsValue = stock.reduce((sum, product) => sum + product.price * product.stock, 0);
    const phoneValue = units
      .filter((phone) => phone.status !== 'SOLD')
      .reduce((sum, phone) => sum + phone.price, 0);

    const meta = {};
    let recovery = false;
    for (const row of rows(vault, 'meta')) {
      const key = String(row.key || '');
      if (key === 'pin_recovery_hash') recovery = String(row.value || '').length >= 32;
      if (!key || key.endsWith('__at') || key.includes('token') || key.includes('pin')) continue;
      meta[key] = row.value ?? '';
    }

    const staff = rows(vault, 'staff').map((person) => ({
      id: person.id,
      name: person.name,
      role: person.role,
      active: num(person.active) !== 0,
      photo: String(person.photo || ''),
      perms: {
        stock: person.role === 'OWNER' || num(person.perm_stock) !== 0,
        cost: person.role === 'OWNER' || num(person.perm_cost) !== 0,
        history: person.role === 'OWNER' || num(person.perm_history) !== 0,
        debts: person.role === 'OWNER' || num(person.perm_debts) !== 0,
        customers: person.role === 'OWNER' || num(person.perm_customers) !== 0,
        reports: person.role === 'OWNER' || num(person.perm_reports) !== 0,
        edit: person.role === 'OWNER' || num(person.perm_edit) !== 0,
        analysis: person.role === 'OWNER' || num(person.perm_analysis) !== 0,
      },
    }));

    const payload = {
      success: true,
      data: {
        linked,
        mode: loaded.target.mode,
        revision: num(vault.revision),
        shop: {
          name: meta.shop_name || 'PhoneVault',
          location: meta.shop_location || '',
          phone: meta.shop_phone || '',
          footer: meta.receipt_footer || '',
          lipa: meta.lipa_namba || '',
          logo: meta.shop_logo || '',
          lang: ['sw', 'en', 'ar'].includes(meta.ui_lang) ? meta.ui_lang : 'sw',
          recovery,
        },
        money: {
          receipts,
          billed,
          cashSales,
          lipaSales,
          cashDebts,
          lipaDebts,
          changeOut,
          refunds,
          drawer: cashSales + cashDebts + lipaSales + lipaDebts - refunds,
          cost,
          profit: billed - cost,
          openDebt: openDebts.reduce((sum, debt) => sum + debt.balance, 0),
          openDebtCount: openDebts.length,
        },
        sales: ledger.slice(0, 500),
        saleCount: ledger.length,
        debts: debtBook,
        returns: returnRows.slice(0, 200),
        stock,
        units: units.filter((phone) => phone.status !== 'SOLD').slice(0, 400),
        stockValue: goodsValue + phoneValue,
        low: stock.filter((product) => product.stock <= product.reorder).length,
        customers: customers.map((customer) => ({
          id: customer.id,
          name: customer.name,
          phone: customer.phone,
          spent: num(customer.spent),
        })),
        wings: wings.map((wing) => ({
          id: wing.id,
          person: wing.person_name,
          phone: wing.person_phone,
          status: wing.status,
          note: wing.note || '',
          at: wing.taken_at,
          items: wingItems
            .filter((item) => String(item.wing_id) === String(wing.id))
            .map((item) => ({
              id: item.id,
              name: item.name,
              qty: num(item.qty),
              back: num(item.returned_qty),
              productId: item.product_id || '',
              phoneId: item.phone_id || '',
            })),
        })),
        faults: faults.map((fault) => ({
          id: fault.id,
          name: fault.name,
          qty: num(fault.qty),
          cost: num(fault.cost),
          source: fault.source,
          kind: fault.phone_id ? 'Simu' : 'Kifaa',
          note: fault.note || '',
          at: fault.created_at,
        })),
        notes: notes
          .slice()
          .sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')))
          .slice(0, 80)
          .map((note) => ({ id: note.id, title: note.title, body: note.body, kind: note.kind || '', read: num(note.read) === 1, at: note.created_at })),
        moves: moves
          .filter((move) => inside(move.created_at, range))
          .slice(0, 200)
          .map((move) => ({
            id: move.id,
            name: move.name,
            delta: num(move.delta),
            reason: move.reason,
            at: move.created_at,
          })),
        categories: rows(vault, 'categories').map((row) => ({ id: row.id, name: row.name, kind: row.kind || '' })),
        hidden: String((rows(vault, 'meta').find((row) => row.key === 'history_hidden_sales') || {}).value || '').split(',').filter(Boolean),
        hiddenUntil: String((rows(vault, 'meta').find((row) => row.key === 'history_hidden_until') || {}).value || ''),
        staff,
        days: dayBars(ledger),
        reports: reportPack(vault, range, ledger),
        profit: profitBook(vault, range),
        cashiers: cashierLines(vault, range),
        groups: groupLines(vault, range),
        warranty: ledger
          .flatMap((sale) => sale.items.filter((item) => item.warrantyDays > 0).map((item) => {
            const elapsed = Math.max(0, Math.floor((Date.now() - new Date(sale.at).getTime()) / 86400000));
            return {
              id: `${sale.id}-${item.id}`,
              name: item.name,
              imei: item.imei,
              customer: sale.customer,
              invoice: sale.invoice,
              days: item.warrantyDays,
              left: item.warrantyDays - (Number.isNaN(elapsed) ? 0 : elapsed),
              at: sale.at,
            };
          }))
          .slice(0, 200),
      },
    };
    redactShop(payload.data, viewer);
    shopMemos.set(memoKey, payload);
    if (shopMemos.size > 8) shopMemos.delete(shopMemos.keys().next().value);
    res.json(payload);
  } catch (error) {
    res.status(500).json({ error: true, message: error.message });
  }
}

export function freshId() {
  return `desk-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function editVault(req, change) {
  const loaded = await vaultFrom(req);
  if (loaded.error) return { error: loaded.error };
  const vault = loaded.vault;
  const seen = req.get('x-vault-revision');
  if (seen && Number(seen) !== num(vault.revision)) return { error: 'Daftari limebadilika. Pakia upya.' };
  if (!Array.isArray(vault.products) && !Array.isArray(vault.sales)) return { error: 'Duka halijaunganishwa.' };
  const copy = JSON.parse(JSON.stringify(vault));
  const message = change(copy);
  if (message) return { error: message };
  const saved = await keepVault(req, loaded.target, copy);
  if (saved) return { error: saved };
  return { ok: true };
}

function phoneItem(item, types) {
  return Boolean(item.phone_id) || types.get(String(item.product_id || '')) === 'PHONE';
}

function profitBook(vault, range) {
  const types = new Map(rows(vault, 'products').map((row) => [String(row.id), row.type]));
  const open = new Set(rows(vault, 'sales').filter((sale) => num(sale.voided) === 0 && inside(sale.created_at, range)).map((sale) => String(sale.id)));
  const side = () => ({ sales: 0, cost: 0, returned: 0 });
  const phones = side();
  const goods = side();
  let faultSales = 0;
  for (const item of rows(vault, 'sale_items')) {
    if (!open.has(String(item.sale_id))) continue;
    const revenue = num(item.price) * num(item.qty);
    const cost = num(item.cost) * num(item.qty);
    if (num(item.faulty) === 1) faultSales += revenue;
    else {
      const bucket = phoneItem(item, types) ? phones : goods;
      bucket.sales += revenue;
      bucket.cost += cost;
    }
  }
  const returns = new Map(rows(vault, 'returns').map((row) => [String(row.id), row]));
  for (const item of rows(vault, 'return_items')) {
    const parent = returns.get(String(item.return_id));
    if (!parent || !inside(parent.created_at, range)) continue;
    const bucket = phoneItem(item, types) ? phones : goods;
    bucket.returned += num(item.price) * num(item.qty);
  }
  let phoneFaults = 0;
  let goodsFaults = 0;
  for (const fault of rows(vault, 'faults')) {
    if (!inside(fault.created_at, range)) continue;
    const cost = num(fault.cost) * num(fault.qty);
    if (phoneItem(fault, types)) phoneFaults += cost;
    else goodsFaults += cost;
  }
  phones.profit = phones.sales - phones.cost - phones.returned;
  goods.profit = goods.sales - goods.cost - goods.returned;
  const faultProfit = faultSales - phoneFaults - goodsFaults;
  return { phones, goods, faultSales, phoneFaults, goodsFaults, faultProfit, shopProfit: phones.profit + goods.profit + faultProfit };
}

function cashierLines(vault, range) {
  const map = new Map();
  for (const sale of rows(vault, 'sales')) {
    if (num(sale.voided) === 1 || !inside(sale.created_at, range)) continue;
    const name = sale.cashier_name || 'Kaunta';
    const row = map.get(name) || { name, receipts: 0, total: 0 };
    row.receipts += 1;
    row.total += num(sale.total);
    map.set(name, row);
  }
  return [...map.values()];
}

function groupLines(vault, range) {
  const open = new Set(rows(vault, 'sales').filter((sale) => num(sale.voided) === 0 && inside(sale.created_at, range)).map((sale) => String(sale.id)));
  const map = new Map();
  for (const item of rows(vault, 'sale_items')) {
    if (!open.has(String(item.sale_id))) continue;
    const name = item.category_name || 'Nyingine';
    const row = map.get(name) || { name, qty: 0, total: 0 };
    row.qty += num(item.qty);
    row.total += num(item.price) * num(item.qty);
    map.set(name, row);
  }
  return [...map.values()];
}

export function reply(res, result) {
  if (result.error) return res.status(400).json({ error: true, message: result.error });
  return res.json({ success: true });
}

export async function createProduct(req, res) {
  const name = String(req.body?.name || '').trim();
  const type = req.body?.type === 'PHONE' ? 'PHONE' : 'ACCESSORY';
  const price = num(req.body?.price);
  const cost = num(req.body?.cost);
  const remote = shopTarget(req).mode === 'remote';
  const stock = remote ? 0 : Math.max(0, Math.round(num(req.body?.stock)));
  const warranty = Math.round(num(req.body?.warrantyDays));
  if (name.length < 2) return res.status(400).json({ error: true, message: 'Weka jina.' });
  if (price < 0 || cost < 0) return res.status(400).json({ error: true, message: 'Weka bei sahihi.' });
  if (warranty < 0 || warranty > 730) return res.status(400).json({ error: true, message: 'Warranty iwe siku 0 hadi 730.' });
  reply(res, await editVault(req, (vault) => {
    if (!Array.isArray(vault.products)) vault.products = [];
    if (!Array.isArray(vault.categories)) vault.categories = [];
    let category = vault.categories.find((row) => (type === 'PHONE' ? row.kind === 'phone' || row.id === 'phones' : row.kind !== 'phone' && row.id !== 'phones'));
    if (!category) {
      category = { id: type === 'PHONE' ? 'phones' : 'goods', name: type === 'PHONE' ? 'Simu' : 'Vifaa', slug: type === 'PHONE' ? 'phones' : 'goods', kind: type === 'PHONE' ? 'phone' : 'goods' };
      vault.categories.push(category);
    }
    const productName = name.slice(0, 80);
    const fault = remote ? 0 : Math.max(0, Math.round(num(req.body?.fault)));
    const id = freshId();
    vault.products.push({
      id,
      name: productName,
      type,
      category_id: req.body?.categoryId || category.id,
      brand: String(req.body?.brand || '').slice(0, 30),
      price,
      cost,
      stock,
      barcode: String(req.body?.barcode || '').slice(0, 40),
      reorder_level: Math.max(0, Math.round(num(req.body?.reorder) || 3)),
      warranty_months: 0,
      warranty_days: warranty,
      fault_qty: fault,
      active: 1,
      color: String(req.body?.color || '').slice(0, 30),
      size: String(req.body?.size || '').slice(0, 30),
      storage: String(req.body?.storage || '').slice(0, 20),
      ram: String(req.body?.ram || '').slice(0, 20),
      screen: String(req.body?.screen || '').slice(0, 20),
      condition: type === 'PHONE' ? (req.body?.condition || 'NEW') : '',
    });
    if (stock > 0) pushMove(vault, productName, stock, 'MZIGO', req);
    if (fault > 0) noteFault(vault, req, { name: productName, qty: fault, cost, productId: id });
    return '';
  }));
}

export async function patchSale(req, res) {
  const customer = String(req.body?.customer || '').trim().slice(0, 80);
  const phone = String(req.body?.phone || '').trim().slice(0, 20);
  if (customer.length < 2) return res.status(400).json({ error: true, message: 'Weka jina la mteja.' });
  reply(res, await editVault(req, (vault) => {
    const sale = rows(vault, 'sales').find((row) => String(row.id) === String(req.params.id));
    if (!sale) return 'Risiti haipo.';
    sale.customer_name = customer;
    sale.customer_phone = phone;
    return '';
  }));
}

export async function hideSale(req, res) {
  reply(res, await editVault(req, (vault) => {
    if (!Array.isArray(vault.meta)) vault.meta = [];
    const row = vault.meta.find((item) => item.key === 'history_hidden_sales');
    const ids = new Set(String(row?.value || '').split(',').filter(Boolean));
    const id = String(req.params.id);
    if (ids.has(id)) ids.delete(id);
    else ids.add(id);
    const value = [...ids].join(',');
    if (row) row.value = value;
    else vault.meta.push({ key: 'history_hidden_sales', value });
    return '';
  }));
}

export async function voidSale(req, res) {
  reply(res, await editVault(req, (vault) => {
    const sale = rows(vault, 'sales').find((row) => String(row.id) === String(req.params.id));
    if (!sale) return 'Risiti haipo.';
    if (num(sale.voided) === 1) return 'Risiti tayari imefutwa.';
    if (num(sale.returned) > 0.5) return 'Risiti hii ina marejesho.';
    const debts = rows(vault, 'debts').filter((row) => String(row.sale_id) === String(sale.id));
    for (const debt of debts) {
      const pays = rows(vault, 'debt_payments').filter((row) => String(row.debt_id) === String(debt.id));
      if (pays.length) return 'Deni lina malipo. Huwezi kufuta risiti hii.';
    }
    for (const item of rows(vault, 'sale_items').filter((row) => String(row.sale_id) === String(sale.id))) {
      const qty = num(item.qty);
      const faulty = num(item.faulty) === 1;
      if (item.phone_id) {
        const phone = rows(vault, 'phone_units').find((row) => String(row.id) === String(item.phone_id));
        if (phone) phone.status = faulty ? 'FAULTY' : 'IN_STOCK';
      } else if (item.product_id) {
        const product = rows(vault, 'products').find((row) => String(row.id) === String(item.product_id));
        if (product) {
          if (faulty) product.fault_qty = num(product.fault_qty) + qty;
          else product.stock = num(product.stock) + qty;
          product.active = 1;
        }
      }
      if (!Array.isArray(vault.stock_moves)) vault.stock_moves = [];
      if (!faulty) {
        vault.stock_moves.push({
          id: freshId(),
          name: item.name,
          delta: qty,
          reason: 'RUDISHO',
          note: sale.invoice,
          staff_name: req.user?.name || 'Mmiliki',
          created_at: new Date().toISOString(),
        });
      }
    }
    sale.voided = 1;
    sale.balance = 0;
    pushNote(vault, 'Risiti imefutwa', `${req.user?.name || 'Mmiliki'} · ${sale.invoice}`, `AUDIT:VOID:${sale.id}`);
    for (const debt of debts) {
      debt.status = 'VOID';
      debt.balance = 0;
    }
    return '';
  }));
}

export function pushMove(vault, name, delta, reason, req) {
  if (!Array.isArray(vault.stock_moves)) vault.stock_moves = [];
  vault.stock_moves.push({
    id: freshId(),
    name,
    delta,
    reason,
    note: '',
    staff_name: req.user?.name || 'Mmiliki',
    created_at: new Date().toISOString(),
  });
}

export function pushNote(vault, title, body, kind) {
  if (!Array.isArray(vault.notifications)) vault.notifications = [];
  vault.notifications.push({
    id: freshId(),
    title,
    body,
    kind,
    read: 0,
    created_at: new Date().toISOString(),
  });
}

export async function patchProduct(req, res) {
  const price = num(req.body?.price);
  const cost = num(req.body?.cost);
  const reorder = Math.round(num(req.body?.reorder));
  const warranty = Math.round(num(req.body?.warrantyDays));
  const remote = shopTarget(req).mode === 'remote';
  if (price < 0 || cost < 0) return res.status(400).json({ error: true, message: 'Weka namba sahihi.' });
  if (warranty < 0 || warranty > 730) return res.status(400).json({ error: true, message: 'Warranty iwe siku 0 hadi 730.' });
  reply(res, await editVault(req, (vault) => {
    const product = rows(vault, 'products').find((row) => String(row.id) === String(req.params.id));
    if (!product) return 'Bidhaa haipo.';
    const stock = remote ? num(product.stock) : Math.max(0, Math.round(num(req.body?.stock)));
    const delta = stock - num(product.stock);
    if (req.body?.name) product.name = String(req.body.name).trim().slice(0, 80);
    product.price = price;
    product.cost = cost;
    product.stock = stock;
    product.reorder_level = reorder;
    product.barcode = String(req.body?.barcode || '').slice(0, 40);
    product.color = String(req.body?.color || '').slice(0, 30);
    product.brand = String(req.body?.brand || '').slice(0, 30);
    product.size = String(req.body?.size || '').slice(0, 30);
    product.storage = String(req.body?.storage || '').slice(0, 20);
    product.ram = String(req.body?.ram || '').slice(0, 20);
    product.screen = String(req.body?.screen || '').slice(0, 20);
    product.condition = String(req.body?.condition || product.condition || '').slice(0, 20);
    product.warranty_days = warranty;
    product.category_id = req.body?.categoryId || product.category_id;
    if (!remote && req.body?.fault != null) {
      const fault = Math.max(0, Math.round(num(req.body.fault)));
      const fresh = fault - num(product.fault_qty);
      product.fault_qty = fault;
      if (fresh !== 0) noteFault(vault, req, { name: product.name, qty: fresh, cost, productId: product.id, note: fresh < 0 ? 'Imerudi kuuzwa' : '' });
    }
    if (delta !== 0) pushMove(vault, product.name, delta, 'MAREKEBISHO', req);
    return '';
  }));
}

export async function createPhone(req, res) {
  const name = String(req.body?.name || '').trim().slice(0, 80);
  const imei = String(req.body?.imei || '').trim();
  const condition = String(req.body?.condition || 'NEW');
  const price = num(req.body?.price);
  const cost = num(req.body?.cost);
  const warranty = Math.round(num(req.body?.warrantyDays));
  if (name.length < 2) return res.status(400).json({ error: true, message: 'Weka jina la simu.' });
  if (!/^\d{8,20}$/.test(imei)) return res.status(400).json({ error: true, message: 'IMEI iwe tarakimu 8 hadi 20.' });
  if (!['NEW', 'LIKE NEW', 'USED'].includes(condition)) return res.status(400).json({ error: true, message: 'Hali ya simu si sahihi.' });
  if (price < 0 || cost < 0) return res.status(400).json({ error: true, message: 'Weka bei sahihi.' });
  if (warranty < 0 || warranty > 730) return res.status(400).json({ error: true, message: 'Warranty iwe siku 0 hadi 730.' });
  reply(res, await editVault(req, (vault) => {
    if (!Array.isArray(vault.phone_units)) vault.phone_units = [];
    if (vault.phone_units.some((row) => String(row.imei) === imei)) return 'IMEI hii tayari ipo.';
    vault.phone_units.push({
      id: freshId(),
      product_name: name,
      imei,
      color: String(req.body?.color || '').slice(0, 30),
      storage: String(req.body?.storage || '').slice(0, 20),
      ram: String(req.body?.ram || '').slice(0, 20),
      screen: String(req.body?.screen || '').slice(0, 20),
      condition,
      price,
      cost,
      floor_price: num(req.body?.floor) || price,
      status: req.body?.faulty ? 'FAULTY' : 'IN_STOCK',
      warranty_months: 0,
      warranty_days: warranty,
      category_id: req.body?.categoryId || '',
    });
    pushMove(vault, name, 1, 'MZIGO', req);
    if (req.body?.faulty) noteFault(vault, req, { name, qty: 1, cost, phoneId: vault.phone_units[vault.phone_units.length - 1].id });
    return '';
  }));
}

function noteFault(vault, req, { name, qty, cost, productId, phoneId, note }) {
  if (!qty) return;
  if (!Array.isArray(vault.faults)) vault.faults = [];
  vault.faults.push({
    id: freshId(),
    name,
    qty,
    cost,
    source: 'MPYA',
    product_id: productId || '',
    phone_id: phoneId || '',
    note: note || '',
    staff_name: req.user?.name || 'Mmiliki',
    created_at: new Date().toISOString(),
  });
}

export async function createCategory(req, res) {
  const name = String(req.body?.name || '').trim().slice(0, 40);
  const kind = req.body?.kind === 'phone' ? 'phone' : 'goods';
  if (name.length < 2) return res.status(400).json({ error: true, message: 'Weka jina la kundi.' });
  reply(res, await editVault(req, (vault) => {
    if (!Array.isArray(vault.categories)) vault.categories = [];
    vault.categories.push({ id: freshId(), name, slug: name.toLowerCase().replace(/\s+/g, '-'), kind });
    return '';
  }));
}

export async function patchCategory(req, res) {
  const name = String(req.body?.name || '').trim().slice(0, 40);
  if (name.length < 2) return res.status(400).json({ error: true, message: 'Weka jina la kundi.' });
  reply(res, await editVault(req, (vault) => {
    const category = rows(vault, 'categories').find((row) => String(row.id) === String(req.params.id));
    if (!category) return 'Kundi halipo.';
    category.name = name;
    return '';
  }));
}

export async function returnSale(req, res) {
  const reason = String(req.body?.reason || '').trim().slice(0, 120);
  const picks = (Array.isArray(req.body?.picks) ? req.body.picks : [])
    .map((pick) => ({ itemId: String(pick.itemId || ''), qty: Math.round(num(pick.qty)), faulty: Boolean(pick.faulty) }))
    .filter((pick) => pick.qty > 0);
  if (reason.length < 3) return res.status(400).json({ error: true, message: 'Andika sababu ya kurudisha.' });
  if (!picks.length) return res.status(400).json({ error: true, message: 'Chagua bidhaa ya kurudisha.' });
  reply(res, await editVault(req, (vault) => {
    const sale = rows(vault, 'sales').find((row) => String(row.id) === String(req.params.id));
    if (!sale) return 'Risiti haipo.';
    if (num(sale.voided) === 1) return 'Risiti hii imefutwa.';
    const items = rows(vault, 'sale_items').filter((row) => String(row.sale_id) === String(sale.id));
    const already = new Map();
    for (const row of rows(vault, 'return_items')) {
      if (!items.some((item) => String(item.id) === String(row.sale_item_id))) continue;
      const id = String(row.sale_item_id);
      already.set(id, (already.get(id) || 0) + num(row.qty));
    }
    let total = 0;
    const lines = [];
    for (const pick of picks) {
      const item = items.find((row) => String(row.id) === pick.itemId);
      if (!item) return 'Bidhaa haipo kwenye risiti.';
      const left = num(item.qty) - (already.get(pick.itemId) || 0);
      if (pick.qty > left) return `${item.name} imezidi idadi iliyouzwa.`;
      if (item.phone_id) {
        const phone = rows(vault, 'phone_units').find((row) => String(row.id) === String(item.phone_id));
        if (!phone || phone.status !== 'SOLD') return `${item.name} haiwezi kurudi. Tayari haiko kama iliyouzwa.`;
      }
      total += num(item.price) * pick.qty;
      lines.push({ item, pick });
    }
    const returnedBefore = num(sale.returned);
    const netGoods = Math.max(0, num(sale.total) - returnedBefore - total);
    const paid = num(sale.paid);
    const owed = Math.max(0, netGoods - paid);
    const refund = Math.max(0, paid - netGoods);
    const when = new Date().toISOString();
    const returnId = freshId();
    const invoice = `RTN-${new Date().getFullYear()}-${String(rows(vault, 'returns').length + 1).padStart(4, '0')}`;
    if (!Array.isArray(vault.returns)) vault.returns = [];
    if (!Array.isArray(vault.return_items)) vault.return_items = [];
    vault.returns.push({
      id: returnId,
      sale_id: sale.id,
      invoice,
      sale_invoice: sale.invoice,
      reason,
      cashier_name: req.user?.name || 'Mmiliki',
      total,
      refund,
      created_at: when,
    });
    for (const { item, pick } of lines) {
      const faulty = pick.faulty;
      vault.return_items.push({
        id: freshId(),
        return_id: returnId,
        sale_item_id: item.id,
        name: item.name,
        qty: pick.qty,
        price: num(item.price),
        cost: num(item.cost),
        phone_id: item.phone_id || '',
        faulty: faulty ? 1 : 0,
      });
      if (item.phone_id) {
        const phone = rows(vault, 'phone_units').find((row) => String(row.id) === String(item.phone_id));
        if (phone) phone.status = faulty ? 'FAULTY' : 'IN_STOCK';
      } else if (item.product_id) {
        const product = rows(vault, 'products').find((row) => String(row.id) === String(item.product_id));
        if (product) {
          if (faulty) product.fault_qty = num(product.fault_qty) + pick.qty;
          else product.stock = num(product.stock) + pick.qty;
          product.active = 1;
        }
      }
      if (faulty && num(item.faulty) !== 1) {
        if (!Array.isArray(vault.faults)) vault.faults = [];
        vault.faults.push({
          id: freshId(),
          name: item.name,
          qty: pick.qty,
          cost: num(item.cost),
          source: 'RUDI',
          product_id: item.product_id || '',
          phone_id: item.phone_id || '',
          note: reason,
          staff_name: req.user?.name || 'Mmiliki',
          created_at: when,
        });
      } else pushMove(vault, item.name, pick.qty, 'RUDISHO', req);
    }
    sale.returned = returnedBefore + total;
    sale.balance = owed;
    const debt = rows(vault, 'debts').find((row) => String(row.sale_id) === String(sale.id) && row.status !== 'VOID');
    if (debt) {
      const full = returnedBefore + total >= num(sale.total) - 0.5;
      debt.balance = owed;
      debt.status = owed <= 0.5 ? (full && paid <= 0.5 ? 'VOID' : 'PAID') : 'OPEN';
    }
    const customer = String(sale.customer_name || '');
    const phone = String(sale.customer_phone || '');
    if (customer && customer !== 'Walk-in') {
      const match = rows(vault, 'customers').find((row) => (phone.length >= 9 ? String(row.phone) === phone : String(row.name) === customer));
      if (match) match.spent = Math.max(0, num(match.spent) - total);
    }
    pushNote(vault, 'Mauzo yamerudishwa', `${sale.invoice} · ${reason} · TSH ${Math.round(total)}.`, `RETURN:${returnId}`);
    return '';
  }));
}

export async function returnWing(req, res) {
  const picks = (Array.isArray(req.body?.picks) ? req.body.picks : [])
    .map((pick) => ({ id: String(pick.id || ''), qty: Math.round(num(pick.qty)) }))
    .filter((pick) => pick.qty > 0);
  if (!picks.length) return res.status(400).json({ error: true, message: 'Chagua idadi anayorudisha.' });
  reply(res, await editVault(req, (vault) => {
    const wing = rows(vault, 'wings').find((row) => String(row.id) === String(req.params.id));
    if (!wing) return 'Rekodi haipo.';
    const items = rows(vault, 'wing_items').filter((row) => String(row.wing_id) === String(wing.id));
    const chosen = [];
    for (const pick of picks) {
      const item = items.find((row) => String(row.id) === pick.id);
      if (!item) return 'Bidhaa haipo kwenye mrengo.';
      const left = num(item.qty) - num(item.returned_qty);
      if (pick.qty > left) return `${item.name} imezidi idadi iliyo nje.`;
      chosen.push({ item, qty: pick.qty });
    }
    for (const { item, qty } of chosen) {
      if (item.phone_id) {
        const phone = rows(vault, 'phone_units').find((row) => String(row.id) === String(item.phone_id));
        if (phone && phone.status !== 'SOLD') phone.status = 'IN_STOCK';
      } else if (item.product_id) {
        const product = rows(vault, 'products').find((row) => String(row.id) === String(item.product_id));
        if (product) {
          product.stock = num(product.stock) + qty;
          product.active = 1;
          pushMove(vault, product.name, qty, 'MAWINGA', req);
        }
      }
      item.returned_qty = num(item.returned_qty) + qty;
    }
    const still = items.some((row) => num(row.qty) > num(row.returned_qty));
    if (!still) {
      wing.status = 'BACK';
      wing.returned_at = new Date().toISOString();
    }
    return '';
  }));
}

export async function dropWing(req, res) {
  reply(res, await editVault(req, (vault) => {
    const wing = rows(vault, 'wings').find((row) => String(row.id) === String(req.params.id));
    if (!wing) return 'Rekodi haipo.';
    if (wing.status !== 'BACK') return 'Rudisha kwanza, kisha uondoe.';
    vault.wing_items = rows(vault, 'wing_items').filter((row) => String(row.wing_id) !== String(wing.id));
    vault.wings = rows(vault, 'wings').filter((row) => String(row.id) !== String(wing.id));
    return '';
  }));
}

export async function patchCustomer(req, res) {
  const name = String(req.body?.name || '').trim();
  const phone = String(req.body?.phone || '').trim();
  if (name.length < 2) return res.status(400).json({ error: true, message: 'Weka jina la mteja.' });
  reply(res, await editVault(req, (vault) => {
    const customer = rows(vault, 'customers').find((row) => String(row.id) === String(req.params.id));
    if (!customer) return 'Mteja hayupo.';
    customer.name = name.slice(0, 80);
    customer.phone = phone.slice(0, 20);
    return '';
  }));
}

export async function payDebt(req, res) {
  const amount = num(req.body?.amount);
  const method = req.body?.method === 'LIPA' ? 'LIPA' : 'CASH';
  const note = String(req.body?.note || '').trim().slice(0, 80);
  if (method === 'LIPA' && note.length < 3) return res.status(400).json({ error: true, message: 'Weka kumbukumbu ya Lipa.' });
  reply(res, await editVault(req, (vault) => {
    const debt = rows(vault, 'debts').find((row) => String(row.id) === String(req.params.id));
    if (!debt) return 'Deni halipo.';
    if (String(debt.status) !== 'OPEN') return 'Deni hili tayari limefungwa.';
    const balance = num(debt.balance);
    if (amount <= 0) return 'Weka kiasi.';
    if (amount > balance + 0.5) return 'Kiasi kinazidi deni lililobaki.';
    const next = Math.max(0, balance - amount);
    if (!Array.isArray(vault.debt_payments)) vault.debt_payments = [];
    vault.debt_payments.push({
      id: freshId(),
      debt_id: debt.id,
      amount,
      method,
      note,
      cashier_name: req.user?.name || 'Mmiliki',
      created_at: new Date().toISOString(),
    });
    debt.balance = next;
    debt.status = next <= 0.5 ? 'PAID' : 'OPEN';
    const sale = rows(vault, 'sales').find((row) => String(row.id) === String(debt.sale_id));
    if (sale) {
      sale.paid = num(sale.paid) + amount;
      sale.balance = Math.max(0, num(sale.total) - num(sale.paid));
    }
    if (!Array.isArray(vault.notifications)) vault.notifications = [];
    vault.notifications.push({
      id: freshId(),
      title: next <= 0.5 ? 'Deni limelipwa' : 'Malipo ya deni',
      body: `${debt.customer_name} amelipa TSH ${Math.round(amount)}. Baki TSH ${Math.round(next)}.`,
      kind: 'PAY',
      read: 0,
      created_at: new Date().toISOString(),
    });
    return '';
  }));
}

function stampMeta(vault, key, value) {
  if (!Array.isArray(vault.meta)) vault.meta = [];
  const now = new Date().toISOString();
  const row = vault.meta.find((item) => item.key === key);
  if (row) row.value = value;
  else vault.meta.push({ key, value });
  const stamp = vault.meta.find((item) => item.key === `${key}__at`);
  if (stamp) stamp.value = now;
  else vault.meta.push({ key: `${key}__at`, value: now });
}

function picture(raw) {
  const clean = String(raw || '').replace(/\s/g, '');
  if (!clean) return '';
  if (clean.length > 360000 || !/^[A-Za-z0-9+/]+={0,2}$/.test(clean)) return null;
  return clean;
}

export function stretchPin(pin, salt) {
  let digest = createHash('sha256').update(`${salt}:${pin}`).digest();
  for (let i = 1; i < 12000; i += 1) digest = createHash('sha256').update(digest).digest();
  return digest.toString('hex');
}

function samePin(left, right) {
  const a = Buffer.from(String(left));
  const b = Buffer.from(String(right));
  return a.length === b.length && timingSafeEqual(a, b);
}

export function signStaff(person) {
  const key = tokenSecret();
  if (!key) return '';
  return jwt.sign({ typ: 'staff', sub: String(person.id) }, key, { expiresIn: '12h' });
}

export function staffSession(req, vault) {
  const token = String(req.get('x-staff-token') || '');
  if (!token) return null;
  const key = tokenSecret();
  if (!key) return { error: 'Seva haina ufunguo.' };
  let payload;
  try { payload = jwt.verify(token, key); } catch { return { error: 'Ingia tena kwa PIN.' }; }
  if (payload.typ !== 'staff') return { error: 'Ingia tena kwa PIN.' };
  const person = rows(vault, 'staff').find((row) => String(row.id) === String(payload.sub) && num(row.active) !== 0);
  if (!person) return { error: 'Akaunti haipo.' };
  const owner = person.role === 'OWNER';
  const on = (key) => owner || num(person[key]) !== 0;
  return {
    id: String(person.id),
    name: String(person.name || ''),
    owner,
    perms: {
      stock: on('perm_stock'),
      cost: on('perm_cost'),
      history: on('perm_history'),
      debts: on('perm_debts'),
      customers: on('perm_customers'),
      reports: on('perm_reports'),
      edit: on('perm_edit'),
      analysis: on('perm_analysis'),
    },
  };
}

function redactShop(data, viewer) {
  if (!viewer || viewer.owner) return;
  const perms = viewer.perms;
  if (!perms.history) {
    data.sales = (data.sales || []).filter((sale) => String(sale.cashierId) === viewer.id);
    const ids = new Set(data.sales.map((sale) => String(sale.id)));
    data.returns = (data.returns || []).filter((row) => ids.has(String(row.saleId)));
    data.saleCount = data.sales.length;
    data.warranty = (data.warranty || []).filter((row) => data.sales.some((sale) => sale.invoice === row.invoice));
    data.days = [];
  }
  if (!perms.debts) data.debts = [];
  if (!perms.customers) data.customers = [];
  if (!perms.stock) {
    data.low = 0;
    data.stockValue = 0;
  }
  if (!perms.cost) {
    for (const row of data.stock || []) row.cost = 0;
    for (const row of data.units || []) row.cost = 0;
    for (const sale of data.sales || []) for (const item of sale.items || []) item.cost = 0;
    data.money.cost = 0;
    data.money.profit = 0;
    data.profit = {
      phones: { sales: 0, cost: 0, returned: 0, profit: 0 },
      goods: { sales: 0, cost: 0, returned: 0, profit: 0 },
      faultSales: 0, phoneFaults: 0, goodsFaults: 0, faultProfit: 0, shopProfit: 0,
    };
  }
  if (!perms.reports) data.reports = {};
  if (!perms.analysis) {
    data.groups = [];
    data.cashiers = [];
  }
  data.notes = (data.notes || []).filter((note) => {
    const kind = String(note.kind || '');
    if (kind.startsWith('STAFF') || kind.startsWith('VOID')) return false;
    if (kind.startsWith('LOW')) return perms.stock;
    if (kind.startsWith('DEBT') || kind.startsWith('PAY')) return perms.debts;
    if (kind.startsWith('SALE') || kind.startsWith('RETURN')) {
      if (perms.history) return true;
      return viewer.name && String(note.body || '').includes(viewer.name);
    }
    if (kind.startsWith('WING') || kind.startsWith('FAULT')) return true;
    return false;
  });
}

export function pinMatches(person, pin) {
  const salt = String(person.pin_salt || '');
  const stored = String(person.pin_hash || '');
  if (!stored) return false;
  const digest = salt ? stretchPin(pin, salt) : createHash('sha256').update(`phonevault:${pin}`).digest('hex');
  return samePin(stored, digest);
}

export async function saveShop(req, res) {
  const fields = {
    shop_name: String(req.body?.name || '').trim().slice(0, 80),
    shop_location: String(req.body?.location || '').trim().slice(0, 80),
    shop_phone: String(req.body?.phone || '').replace(/\D/g, '').slice(0, 20),
    receipt_footer: String(req.body?.footer || '').trim().slice(0, 160),
    lipa_namba: String(req.body?.lipa || '').replace(/\s+/g, '').slice(0, 20),
  };
  if (fields.shop_name.length < 2) return res.status(400).json({ error: true, message: 'Weka jina la duka.' });
  if (fields.lipa_namba && !/^\d{5,15}$/.test(fields.lipa_namba)) {
    return res.status(400).json({ error: true, message: 'Lipa Namba iwe tarakimu 5 hadi 15.' });
  }
  if (fields.shop_phone && !/^0\d{9}$/.test(fields.shop_phone)) {
    return res.status(400).json({ error: true, message: 'Simu ya duka ianze na 0 na iwe tarakimu 10.' });
  }
  reply(res, await editVault(req, (vault) => {
    for (const [key, value] of Object.entries(fields)) stampMeta(vault, key, value);
    return '';
  }));
}

export async function saveLang(req, res) {
  const lang = ['sw', 'en', 'ar'].includes(req.body?.lang) ? req.body.lang : '';
  if (!lang) return res.status(400).json({ error: true, message: 'Chagua lugha.' });
  reply(res, await editVault(req, (vault) => {
    stampMeta(vault, 'ui_lang', lang);
    return '';
  }));
}

export async function saveLogo(req, res) {
  const logo = picture(req.body?.logo);
  if (logo == null) return res.status(400).json({ error: true, message: 'Picha haikusomeka. Chagua JPG au PNG.' });
  reply(res, await editVault(req, (vault) => {
    stampMeta(vault, 'shop_logo', logo);
    return '';
  }));
}

export async function saveOwnerPhoto(req, res) {
  const photo = picture(req.body?.photo);
  if (photo == null) return res.status(400).json({ error: true, message: 'Picha haikusomeka. Chagua JPG au PNG.' });
  reply(res, await editVault(req, (vault) => {
    const owner = rows(vault, 'staff').find((row) => row.role === 'OWNER');
    if (!owner) return 'Akaunti ya mmiliki haipo.';
    owner.photo = photo;
    return '';
  }));
}

export async function changeOwnerPin(req, res) {
  const oldPin = String(req.body?.oldPin || '');
  const next = String(req.body?.newPin || '');
  const again = String(req.body?.again || '');
  if (!/^\d{4}$/.test(oldPin) || !/^\d{4}$/.test(next)) {
    return res.status(400).json({ error: true, message: 'PIN iwe tarakimu 4.' });
  }
  if (next !== again) return res.status(400).json({ error: true, message: 'PIN hazifanani.' });
  if (oldPin === next) return res.status(400).json({ error: true, message: 'Chagua PIN tofauti.' });
  const loaded = await vaultFrom(req);
  if (loaded.error) return res.status(400).json({ error: true, message: loaded.error });
  const session = staffSession(req, loaded.vault);
  if (session?.error) return res.status(401).json({ error: true, message: session.error });
  const owner = session
    ? rows(loaded.vault, 'staff').find((row) => String(row.id) === session.id && num(row.active) !== 0)
    : rows(loaded.vault, 'staff').find((row) => row.role === 'OWNER' && num(row.active) !== 0);
  if (!owner) return res.status(400).json({ error: true, message: 'Akaunti haipo.' });
  const lockedUntil = Date.parse(owner.pin_locked_until || '');
  if (Number.isFinite(lockedUntil) && lockedUntil > Date.now()) {
    const left = Math.max(1, Math.round((lockedUntil - Date.now()) / 1000));
    return res.status(400).json({ error: true, message: `Subiri sekunde ${left}.` });
  }
  if (!pinMatches(owner, oldPin)) {
    await editVault(req, (vault) => {
      const person = rows(vault, 'staff').find((row) => String(row.id) === String(owner.id));
      if (!person) return 'Akaunti haipo.';
      const fails = num(person.pin_fails) + 1;
      const wait = fails >= 15 ? 1800 : fails >= 10 ? 300 : fails >= 5 ? 60 : 0;
      person.pin_fails = fails;
      person.pin_locked_until = wait ? new Date(Date.now() + wait * 1000).toISOString() : '';
      return '';
    });
    return res.status(400).json({ error: true, message: 'PIN ya zamani si sahihi.' });
  }
  reply(res, await editVault(req, (vault) => {
    const person = rows(vault, 'staff').find((row) => String(row.id) === String(owner.id));
    if (!person) return 'Akaunti haipo.';
    const salt = randomBytes(16).toString('base64url');
    person.pin_salt = salt;
    person.pin_hash = stretchPin(next, salt);
    person.pin_fails = 0;
    person.pin_locked_until = '';
    return '';
  }));
}

export async function saveRecovery(req, res) {
  const word = String(req.body?.word || '').trim();
  const again = String(req.body?.again || '').trim();
  if (word !== again) return res.status(400).json({ error: true, message: 'Maneno hayafanani.' });
  if (word.length < 8 || word.length > 40) return res.status(400).json({ error: true, message: 'Neno liwe herufi 8 hadi 40.' });
  if (!/[A-Za-z]/.test(word)) return res.status(400).json({ error: true, message: 'Neno liwe na herufi, si tarakimu peke yake.' });
  reply(res, await editVault(req, (vault) => {
    const token = String((rows(vault, 'meta').find((row) => row.key === 'sync_token') || {}).value || '').trim();
    if (token && word.replace(/\s+/g, '') === token) return 'Usiandike neno la kuunganisha.';
    const salt = randomBytes(16).toString('base64url');
    stampMeta(vault, 'pin_recovery_salt', salt);
    stampMeta(vault, 'pin_recovery_hash', stretchPin(word, salt));
    stampMeta(vault, 'pin_recovery_fails', '0');
    stampMeta(vault, 'pin_recovery_until', '');
    return '';
  }));
}

export async function patchStaff(req, res) {
  const active = req.body?.active ? 1 : 0;
  reply(res, await editVault(req, (vault) => {
    const person = rows(vault, 'staff').find((row) => String(row.id) === String(req.params.id));
    if (!person) return 'Mfanyakazi hayupo.';
    if (person.role === 'OWNER' && active === 0) return 'Mmiliki hawezi kusimamishwa.';
    person.active = active;
    return '';
  }));
}

export async function exportCsv(req, res) {
  const range = rangeOf(req.query);
  if (!range) return res.status(400).json({ error: true, message: 'Tarehe si sahihi.' });
  const loaded = await vaultFrom(req);
  if (loaded.error) return res.status(400).json({ error: true, message: loaded.error });
  const vault = loaded.vault;
  const kind = req.params.kind;
  const lines = [];
  if (kind === 'mauzo') {
    lines.push('risiti,mteja,simu,kiasi,njia,tarehe');
    for (const sale of rows(vault, 'sales')) {
      if (num(sale.voided) === 1 || !inside(sale.created_at, range)) continue;
      lines.push([sale.invoice, sale.customer_name, sale.customer_phone, num(sale.total), sale.method, sale.created_at].map(csv).join(','));
    }
  } else if (kind === 'stoo') {
    lines.push('jina,aina,bei,gharama,idadi');
    for (const product of rows(vault, 'products')) {
      if (num(product.active) === 0) continue;
      lines.push([product.name, product.type, num(product.price), num(product.cost), num(product.stock)].map(csv).join(','));
    }
  } else if (kind === 'madeni') {
    lines.push('mteja,simu,chanzo,baki,hali');
    for (const debt of rows(vault, 'debts')) {
      lines.push([debt.customer_name, debt.customer_phone, num(debt.principal), num(debt.balance), debt.status].map(csv).join(','));
    }
  } else if (kind === 'wateja') {
    lines.push('jina,simu,ametumia');
    for (const customer of rows(vault, 'customers')) {
      lines.push([customer.name, customer.phone, num(customer.spent)].map(csv).join(','));
    }
  } else {
    return res.status(404).json({ error: true, message: 'Faili hili halipo.' });
  }
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="phonevault-${kind}.csv"`);
  res.send(`\uFEFF${lines.join('\n')}`);
}

export async function exportXlsx(req, res) {
  const range = rangeOf(req.query);
  if (!range) return res.status(400).json({ error: true, message: 'Tarehe si sahihi.' });
  const loaded = await vaultFrom(req);
  if (loaded.error) return res.status(400).json({ error: true, message: loaded.error });
  const vault = loaded.vault;
  const ledger = rows(vault, 'sales')
    .filter((sale) => num(sale.voided) === 0 && inside(sale.created_at, range))
    .map((sale) => ({
      invoice: sale.invoice,
      at: sale.created_at,
      customer: sale.customer_name,
      phone: sale.customer_phone,
      total: num(sale.total),
      paid: num(sale.paid),
      balance: num(sale.balance),
      method: sale.method,
      cashier: sale.cashier_name,
    }));
  const table = reportPack(vault, range, ledger)[req.params.kind];
  if (!table) return res.status(404).json({ error: true, message: 'Ripoti haipo.' });
  const book = new ExcelJS.Workbook();
  const sheet = book.addWorksheet('Ripoti');
  sheet.addRow(table.heads);
  sheet.getRow(1).font = { bold: true };
  for (const line of table.rows) sheet.addRow(line);
  sheet.columns.forEach((column) => { column.width = 18; });
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="phonevault-${req.params.kind}.xlsx"`);
  await book.xlsx.write(res);
  res.end();
}

function dayBars(ledger) {
  const map = new Map();
  for (const sale of ledger) {
    const day = String(sale.at || '').slice(0, 10);
    if (!day) continue;
    map.set(day, (map.get(day) || 0) + num(sale.total));
  }
  return [...map.entries()].sort().map(([day, total]) => ({ day: day.slice(5), total }));
}

function reportPack(vault, range, ledger) {
  const profitRows = [];
  const types = new Map(rows(vault, 'products').map((row) => [String(row.id), row.type]));
  const salesById = new Map(rows(vault, 'sales').map((sale) => [String(sale.id), sale]));
  for (const item of rows(vault, 'sale_items')) {
    const sale = salesById.get(String(item.sale_id));
    if (!sale || num(sale.voided) === 1 || !inside(sale.created_at, range)) continue;
    const qty = num(item.qty);
    const fault = num(item.faulty) === 1;
    const gain = fault ? num(item.price) * qty : (num(item.price) - num(item.cost)) * qty;
    const kind = fault ? 'tatizo' : (item.phone_id || types.get(String(item.product_id || '')) === 'PHONE' ? 'simu' : 'kifaa');
    profitRows.push([sale.created_at, sale.invoice, kind, item.name, qty, num(item.price), num(item.cost), gain]);
  }
  const low = rows(vault, 'products').filter((row) => num(row.active) !== 0 && num(row.stock) <= num(row.reorder_level));
  const moves = rows(vault, 'stock_moves').filter((row) => inside(row.created_at, range));
  return {
    faida: { heads: ['Tarehe', 'Risiti', 'Aina', 'Bidhaa', 'Idadi', 'Bei', 'Gharama', 'Faida'], rows: profitRows },
    mauzo: { heads: ['Risiti', 'Tarehe', 'Mteja', 'Simu', 'Jumla', 'Yamelipwa', 'Deni', 'Njia', 'Muuzaji'], rows: ledger.map((sale) => [sale.invoice, sale.at, sale.customer, sale.phone, sale.total, sale.paid, sale.balance, sale.method, sale.cashier]) },
    madeni: { heads: ['Mteja', 'Simu', 'Siku', 'Kilichokopwa', 'Baki', 'Hali'], rows: rows(vault, 'debts').map((debt) => [debt.customer_name, debt.customer_phone, debt.opened_at, num(debt.principal), num(debt.balance), debt.status]) },
    stoo: { heads: ['Aina', 'Jina', 'Bei', 'Gharama', 'Stoo', 'Msimbo'], rows: rows(vault, 'products').filter((row) => num(row.active) !== 0).map((row) => [row.type, row.name, num(row.price), num(row.cost), num(row.stock), row.barcode || '']) },
    wateja: { heads: ['Jina', 'Simu', 'Manunuzi'], rows: rows(vault, 'customers').map((row) => [row.name, row.phone, num(row.spent)]) },
    wauzaji: { heads: ['Muuzaji', 'Risiti', 'Jumla'], rows: cashierLines(vault, range).map((row) => [row.name, row.receipts, row.total]) },
    vikundi: { heads: ['Kundi', 'Idadi', 'Jumla'], rows: groupLines(vault, range).map((row) => [row.name, row.qty, row.total]) },
    ndogo: { heads: ['Jina', 'Baki', 'Kiwango'], rows: low.map((row) => [row.name, num(row.stock), num(row.reorder_level)]) },
    mwendo: { heads: ['Tarehe', 'Bidhaa', 'Mabadiliko', 'Sababu', 'Aliyefanya'], rows: moves.map((row) => [row.created_at, row.name, num(row.delta), row.reason, row.staff_name]) },
  };
}

function csv(value) {
  const text = String(value ?? '');
  return `"${text.replaceAll('"', '""')}"`;
}
