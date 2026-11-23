import { randomBytes } from 'crypto';
import {
  editVault,
  freshId,
  stretchPin,
  keepVault,
  num,
  pinMatches,
  pushMove,
  pushNote,
  reply,
  rows,
  signStaff,
  staffSession,
  vaultFrom,
} from './admin.controller.js';

function actor(req) {
  return req.user?.name || 'Mmiliki';
}

function setMeta(vault, key, value) {
  if (!Array.isArray(vault.meta)) vault.meta = [];
  const row = vault.meta.find((item) => item.key === key);
  if (row) row.value = value;
  else vault.meta.push({ key, value });
}

function phoneOk(value) {
  return /^0\d{9}$/.test(String(value || '').replace(/\D/g, ''));
}

function imeiHeld(vault, imei) {
  const code = String(imei || '').trim();
  if (!code) return false;
  if (rows(vault, 'phone_units').some((row) => String(row.imei) === code)) return true;
  const returned = new Map();
  for (const row of rows(vault, 'return_items')) {
    const id = String(row.sale_item_id);
    returned.set(id, (returned.get(id) || 0) + num(row.qty));
  }
  const voided = new Set(rows(vault, 'sales').filter((row) => num(row.voided) === 1).map((row) => String(row.id)));
  return rows(vault, 'sale_items').some((row) => String(row.imei || '').trim() === code && !voided.has(String(row.sale_id)) && num(row.qty) > (returned.get(String(row.id)) || 0));
}

function categoryName(vault, id) {
  const row = rows(vault, 'categories').find((item) => String(item.id) === String(id || ''));
  return row?.name || '';
}

export async function checkout(req, res) {
  const method = ['CASH', 'LIPA', 'DENI'].includes(req.body?.method) ? req.body.method : '';
  const lines = Array.isArray(req.body?.lines) ? req.body.lines : [];
  const lipaRef = String(req.body?.lipaRef || '').trim().slice(0, 40);
  const termDays = Math.round(num(req.body?.termDays));
  if (!method) return res.status(400).json({ error: true, message: 'Chagua aina ya malipo.' });
  if (!lines.length) return res.status(400).json({ error: true, message: 'Kikapu kiko tupu.' });
  reply(res, await editVault(req, (vault) => {
    const viewer = staffSession(req, vault);
    if (viewer?.error) return viewer.error;
    const lipa = String((rows(vault, 'meta').find((row) => row.key === 'lipa_namba') || {}).value || '');
    const priced = [];
    for (const raw of lines) {
      const qty = Math.round(num(raw.qty));
      if (qty < 1) return 'Weka idadi.';
      const phone = raw.phoneId ? rows(vault, 'phone_units').find((row) => String(row.id) === String(raw.phoneId)) : null;
      const product = raw.productId ? rows(vault, 'products').find((row) => String(row.id) === String(raw.productId)) : null;
      if (phone) {
        if (phone.status !== 'IN_STOCK' && phone.status !== 'FAULTY') return `${phone.product_name} tayari imeuza.`;
        const floor = num(phone.floor_price) || num(phone.price);
        const price = num(raw.price) || num(phone.price);
        if (price < floor) return `Bei ya ${phone.product_name} iko chini ya sakafu.`;
        priced.push({ name: phone.product_name, qty: 1, price, cost: num(phone.cost), imei: phone.imei, phoneId: phone.id, productId: '', warranty: num(phone.warranty_days), faulty: phone.status === 'FAULTY', category: categoryName(vault, phone.category_id), phone, product: null });
      } else if (product) {
        const faulty = Boolean(raw.faulty);
        const have = faulty ? num(product.fault_qty) : num(product.stock);
        if (have < qty) return `Stoo ya ${product.name} haitoshi.`;
        const code = String(raw.imei || '').replace(/\D/g, '').slice(0, 20);
        if (code && imeiHeld(vault, code)) return 'IMEI hii tayari ipo.';
        const price = num(raw.price) || num(product.price);
        if (price < 0) return 'Bei si sahihi.';
        priced.push({ name: product.name, qty, price, cost: num(product.cost), imei: code, phoneId: '', productId: product.id, warranty: num(product.warranty_days), faulty, category: categoryName(vault, product.category_id), phone: null, product });
      } else return 'Bidhaa haipo.';
    }
    const total = priced.reduce((sum, line) => sum + line.price * line.qty, 0);
    const handed = method === 'DENI' ? 0 : num(req.body?.amount);
    if (handed < 0) return 'Kiasi si sahihi.';
    const paying = method === 'LIPA' ? Math.min(handed, total) : handed;
    const change = method === 'CASH' ? Math.max(0, handed - total) : 0;
    const paid = Math.min(paying, total);
    if (method === 'LIPA' && paid > 0 && lipa.trim().length < 3) return 'Weka Lipa Namba kwenye mipangilio kwanza.';
    if (method === 'LIPA' && paid > 0 && lipaRef.length < 3) return 'Weka kumbukumbu ya Lipa.';
    if (method !== 'DENI' && paid <= 0) return 'Weka kiasi kilicholipwa, au chagua Deni zima.';
    const balance = Math.max(0, total - paid);
    let name = String(req.body?.customer || '').trim().slice(0, 60);
    const phone = String(req.body?.phone || '').replace(/\D/g, '');
    if (!name) name = phone || 'Walk-in';
    if (phone && !phoneOk(phone)) return 'Namba ianze na 0 na iwe tarakimu 10.';
    if (viewer && !viewer.perms.debts && (method === 'DENI' || balance > 0.5)) return 'Huna ruhusa ya madeni.';
    if (balance > 0.5 && (!phoneOk(phone) || name === 'Walk-in')) return 'Deni linahitaji jina na namba ya simu ya mteja.';
    if (balance > 0.5 && (termDays < 1 || termDays > 3600)) return 'Weka muda anaokopa.';
    const id = freshId();
    const invoice = `INV-${new Date().getFullYear()}-${String(rows(vault, 'sales').length + 1).padStart(4, '0')}`;
    const when = new Date().toISOString();
    if (!Array.isArray(vault.sales)) vault.sales = [];
    if (!Array.isArray(vault.sale_items)) vault.sale_items = [];
    vault.sales.push({
      id, invoice, customer_name: name, customer_phone: phone, total, paid, balance, change_due: change,
      method, lipa_ref: lipaRef, cashier_id: viewer?.id || '', cashier_name: viewer?.name || actor(req),
      summary: priced.map((line) => `${line.qty} ${line.name}${line.imei ? ` ${line.imei}` : ''}`).join(', '),
      created_at: when, voided: 0, returned: 0, sync_status: 'LOCAL',
    });
    for (const line of priced) {
      vault.sale_items.push({
        id: freshId(), sale_id: id, name: line.name, qty: line.qty, price: line.price, cost: line.cost,
        imei: line.imei, product_id: line.productId, phone_id: line.phoneId, warranty_months: 0,
        warranty_days: line.warranty, category_name: line.category || '', faulty: line.faulty ? 1 : 0,
      });
      if (!line.faulty) pushMove(vault, line.name, -line.qty, 'MAUZO', req);
      if (line.phone) line.phone.status = 'SOLD';
      else if (line.product && line.faulty) line.product.fault_qty = Math.max(0, num(line.product.fault_qty) - line.qty);
      else if (line.product) {
        line.product.stock = num(line.product.stock) - line.qty;
        const level = line.product.reorder_level == null ? 3 : num(line.product.reorder_level);
        if (num(line.product.stock) <= level) {
          const kind = `LOW:${line.product.id}`;
          if (!rows(vault, 'notifications').some((row) => row.kind === kind && num(row.read) !== 1)) {
            pushNote(vault, 'Stoo ndogo', `${line.name} zimebaki ${num(line.product.stock)}.`, kind);
          }
        }
      }
    }
    if (name !== 'Walk-in') {
      if (!Array.isArray(vault.customers)) vault.customers = [];
      let customer = vault.customers.find((row) => (phone.length >= 9 ? String(row.phone) === phone : String(row.name) === name));
      if (!customer) {
        customer = { id: freshId(), name, phone, spent: 0, created_at: when };
        vault.customers.push(customer);
      }
      customer.spent = num(customer.spent) + total;
    }
    if (balance > 0.5) {
      if (!Array.isArray(vault.debts)) vault.debts = [];
      vault.debts.push({
        id: freshId(), sale_id: id, customer_name: name, customer_phone: phone, principal: balance, balance,
        opened_at: when, status: 'OPEN', due_at: new Date(Date.now() + termDays * 86400000).toISOString(),
        term_days: termDays, term_unit: 'siku', last_reminded: '',
      });
      pushNote(vault, 'Deni jipya', `${name} anadaiwa TSH ${Math.round(balance)} kwenye ${invoice}.`, `DEBT:${id}`);
    }
    const payLabel = method === 'LIPA' ? 'Lipa Namba' : method === 'DENI' ? 'Deni' : 'Cash';
    pushNote(vault, 'Mauzo mapya', `${invoice} ${String(priced[0]?.name || '').slice(0, 80)} · ${viewer?.name || actor(req)} · ${payLabel}.`, `SALE:${id}`);
    return '';
  }));
}

export async function addStock(req, res) {
  const extra = Math.round(num(req.body?.qty));
  if (extra <= 0 || extra > 100000) return res.status(400).json({ error: true, message: 'Weka idadi unayoongeza.' });
  reply(res, await editVault(req, (vault) => {
    const product = rows(vault, 'products').find((row) => String(row.id) === String(req.params.id));
    if (!product) return 'Bidhaa haipo.';
    const next = num(product.stock) + extra;
    if (next > 100000) return 'Idadi si sahihi.';
    product.stock = next;
    product.active = 1;
    pushMove(vault, product.name, extra, 'MZIGO', req);
    pushNote(vault, 'Mzigo', `${actor(req)} · ${product.name} +${extra}`, `AUDIT:STOCK:${product.id}`);
    return '';
  }));
}

export async function retireProduct(req, res) {
  reply(res, await editVault(req, (vault) => {
    const product = rows(vault, 'products').find((row) => String(row.id) === String(req.params.id));
    if (!product) return 'Bidhaa haipo.';
    product.active = 0;
    pushNote(vault, 'Bidhaa imestaafu', `${actor(req)} · ${product.name}`, `AUDIT:RETIRE:${product.id}`);
    return '';
  }));
}

export async function patchPhone(req, res) {
  const price = num(req.body?.price);
  const floor = num(req.body?.floor);
  const warranty = Math.round(num(req.body?.warrantyDays));
  if (price < 0 || floor < 0) return res.status(400).json({ error: true, message: 'Weka bei sahihi.' });
  if (price < floor) return res.status(400).json({ error: true, message: 'Bei iko chini ya sakafu.' });
  if (warranty < 0 || warranty > 730) return res.status(400).json({ error: true, message: 'Warranty iwe siku 0 hadi 730.' });
  reply(res, await editVault(req, (vault) => {
    const phone = rows(vault, 'phone_units').find((row) => String(row.id) === String(req.params.id));
    if (!phone) return 'Simu haipo.';
    if (phone.status === 'SOLD') return 'Simu iliyouzwa haibadiliki.';
    const before = num(phone.price);
    phone.product_name = String(req.body?.name || phone.product_name).slice(0, 80);
    phone.color = String(req.body?.color || '').slice(0, 30);
    phone.storage = String(req.body?.storage || '').slice(0, 20);
    phone.ram = String(req.body?.ram || '').slice(0, 20);
    phone.screen = String(req.body?.screen || '').slice(0, 20);
    phone.condition = ['NEW', 'LIKE NEW', 'USED'].includes(req.body?.condition) ? req.body.condition : phone.condition;
    phone.price = price;
    phone.floor_price = floor || price;
    phone.cost = num(req.body?.cost);
    phone.warranty_days = warranty;
    if (req.body?.faulty === true && phone.status === 'IN_STOCK') {
      phone.status = 'FAULTY';
      if (!Array.isArray(vault.faults)) vault.faults = [];
      vault.faults.push({ id: freshId(), name: phone.product_name, qty: 1, cost: num(phone.cost), source: 'MPYA', product_id: '', phone_id: phone.id, note: '', staff_name: actor(req), created_at: new Date().toISOString() });
    }
    if (req.body?.faulty === false && phone.status === 'FAULTY') phone.status = 'IN_STOCK';
    if (before !== price) pushNote(vault, 'Bei imebadilika', `${actor(req)} · ${phone.product_name} · ${before} → ${price}`, `AUDIT:PRICE:${phone.id}`);
    return '';
  }));
}

export async function deletePhone(req, res) {
  reply(res, await editVault(req, (vault) => {
    const phone = rows(vault, 'phone_units').find((row) => String(row.id) === String(req.params.id));
    if (!phone) return 'Simu haipo.';
    if (phone.status !== 'IN_STOCK' && phone.status !== 'FAULTY') return 'Simu iliyouzwa haiwezi kufutwa.';
    vault.phone_units = rows(vault, 'phone_units').filter((row) => String(row.id) !== String(phone.id));
    pushMove(vault, phone.product_name, -1, 'IMEFUTWA', req);
    pushNote(vault, 'IMEI imefutwa', `${actor(req)} · ${phone.imei}`, `AUDIT:IMEI:${phone.id}`);
    return '';
  }));
}

export async function deleteCategory(req, res) {
  reply(res, await editVault(req, (vault) => {
    const id = String(req.params.id);
    if (id === 'phones') return 'Kundi la simu halifutiki.';
    const category = rows(vault, 'categories').find((row) => String(row.id) === id);
    if (!category) return 'Kundi halipo.';
    const used = rows(vault, 'products').filter((row) => String(row.category_id) === id);
    if (used.length) {
      if (!rows(vault, 'categories').some((row) => row.id === 'nyingine')) {
        vault.categories.push({ id: 'nyingine', name: 'Nyingine', slug: 'nyingine', kind: 'goods' });
      }
      for (const product of used) product.category_id = 'nyingine';
    }
    vault.categories = rows(vault, 'categories').filter((row) => String(row.id) !== id);
    return '';
  }));
}

export async function createCustomer(req, res) {
  const name = String(req.body?.name || '').trim().slice(0, 60);
  const phone = String(req.body?.phone || '').replace(/\D/g, '');
  if (name.length < 2) return res.status(400).json({ error: true, message: 'Weka jina la mteja.' });
  if (!phoneOk(phone)) return res.status(400).json({ error: true, message: 'Namba ianze na 0 na iwe tarakimu 10.' });
  reply(res, await editVault(req, (vault) => {
    if (!Array.isArray(vault.customers)) vault.customers = [];
    vault.customers.push({ id: freshId(), name, phone, spent: 0, created_at: new Date().toISOString() });
    return '';
  }));
}

export async function deleteCustomer(req, res) {
  reply(res, await editVault(req, (vault) => {
    const customer = rows(vault, 'customers').find((row) => String(row.id) === String(req.params.id));
    if (!customer) return 'Mteja haipo.';
    const open = rows(vault, 'debts').some((row) => row.status === 'OPEN' && (String(row.customer_phone) === String(customer.phone) || String(row.customer_name) === String(customer.name)));
    if (open) return 'Ana deni wazi. Pokea malipo kwanza.';
    vault.customers = rows(vault, 'customers').filter((row) => String(row.id) !== String(customer.id));
    return '';
  }));
}

export async function hideDebts(req, res) {
  const mode = String(req.body?.mode || '');
  const id = String(req.body?.id || '');
  reply(res, await editVault(req, (vault) => {
    const row = rows(vault, 'meta').find((item) => item.key === 'debts_hidden');
    const hidden = new Set(String(row?.value || '').split(',').map((part) => part.trim()).filter(Boolean));
    if (mode === 'show') hidden.clear();
    else if (mode === 'paid') {
      for (const debt of rows(vault, 'debts')) if (debt.status === 'PAID') hidden.add(String(debt.id));
    } else if (id) hidden.add(id);
    else return 'Chagua deni.';
    setMeta(vault, 'debts_hidden', [...hidden].sort().join(','));
    setMeta(vault, 'debts_hidden__at', new Date().toISOString());
    return '';
  }));
}

export async function hidePeriod(req, res) {
  reply(res, await editVault(req, (vault) => {
    setMeta(vault, 'history_hidden_until', new Date().toISOString());
    return '';
  }));
}

export async function showHistory(req, res) {
  reply(res, await editVault(req, (vault) => {
    setMeta(vault, 'history_hidden_until', '');
    setMeta(vault, 'history_hidden_sales', '');
    return '';
  }));
}

export async function takeWing(req, res) {
  const person = String(req.body?.person || '').trim().slice(0, 60);
  const phone = String(req.body?.phone || '').replace(/\D/g, '');
  const picks = (Array.isArray(req.body?.picks) ? req.body.picks : []).map((pick) => ({ ...pick, qty: Math.round(num(pick.qty)) })).filter((pick) => pick.qty > 0);
  if (person.length < 2) return res.status(400).json({ error: true, message: 'Weka jina la mtu aliyechukua.' });
  if (phone && !phoneOk(phone)) return res.status(400).json({ error: true, message: 'Namba ianze na 0 na iwe tarakimu 10.' });
  if (!picks.length) return res.status(400).json({ error: true, message: 'Chagua bidhaa aliyochukua.' });
  reply(res, await editVault(req, (vault) => {
    const chosen = [];
    for (const pick of picks) {
      if (pick.phoneId) {
        const unit = rows(vault, 'phone_units').find((row) => String(row.id) === String(pick.phoneId));
        if (!unit || unit.status !== 'IN_STOCK') return 'Simu haiko dukani.';
        chosen.push({ name: unit.product_name, qty: 1, phone: unit, product: null });
      } else if (pick.productId) {
        const product = rows(vault, 'products').find((row) => String(row.id) === String(pick.productId));
        if (!product || num(product.stock) < pick.qty) return `Stoo ya ${product?.name || 'bidhaa'} haitoshi.`;
        chosen.push({ name: product.name, qty: pick.qty, phone: null, product });
      } else return 'Bidhaa haipo.';
    }
    const id = freshId();
    if (!Array.isArray(vault.wings)) vault.wings = [];
    if (!Array.isArray(vault.wing_items)) vault.wing_items = [];
    vault.wings.push({ id, person_name: person, person_phone: phone, note: String(req.body?.note || '').slice(0, 80), status: 'OUT', taken_at: new Date().toISOString(), returned_at: '', staff_name: actor(req) });
    for (const line of chosen) {
      vault.wing_items.push({ id: freshId(), wing_id: id, name: line.name, qty: line.qty, returned_qty: 0, sold_qty: 0, price: 0, sale_id: '', product_id: line.product?.id || '', phone_id: line.phone?.id || '' });
      if (line.phone) line.phone.status = 'WING';
      else {
        line.product.stock = num(line.product.stock) - line.qty;
        pushMove(vault, line.name, -line.qty, 'MAWINGA', req);
      }
    }
    pushNote(vault, 'Mawinga', `${person} amechukua bidhaa. ${actor(req)}.`, `WING:${id}`);
    return '';
  }));
}

export async function createFault(req, res) {
  const name = String(req.body?.name || '').trim().slice(0, 80);
  const qty = Math.max(1, Math.round(num(req.body?.qty) || 1));
  const cost = num(req.body?.cost);
  if (name.length < 2) return res.status(400).json({ error: true, message: 'Weka jina.' });
  reply(res, await editVault(req, (vault) => {
    if (!Array.isArray(vault.faults)) vault.faults = [];
    vault.faults.push({
      id: freshId(), name, qty, cost, source: 'MPYA', product_id: req.body?.productId || '', phone_id: req.body?.phoneId || '',
      note: String(req.body?.note || '').slice(0, 120), staff_name: actor(req), created_at: new Date().toISOString(),
    });
    pushNote(vault, 'Tatizo', `${actor(req)} · ${name}`, `AUDIT:FAULT:${name}`);
    return '';
  }));
}

export async function remindDebt(req, res) {
  reply(res, await editVault(req, (vault) => {
    const debt = rows(vault, 'debts').find((row) => String(row.id) === String(req.params.id));
    if (!debt || debt.status !== 'OPEN') return 'Deni halipo.';
    debt.last_reminded = new Date().toISOString();
    return '';
  }));
}

export async function markNote(req, res) {
  reply(res, await editVault(req, (vault) => {
    const note = rows(vault, 'notifications').find((row) => String(row.id) === String(req.params.id));
    if (!note) return 'Taarifa haipo.';
    note.read = 1;
    return '';
  }));
}

export async function markAllNotes(req, res) {
  reply(res, await editVault(req, (vault) => {
    for (const note of rows(vault, 'notifications')) note.read = 1;
    return '';
  }));
}

export async function dropNote(req, res) {
  reply(res, await editVault(req, (vault) => {
    const list = rows(vault, 'notifications');
    const note = list.find((row) => String(row.id) === String(req.params.id));
    if (!note) return 'Taarifa haipo.';
    if (num(note.read) !== 1) return 'Soma kwanza, kisha futa.';
    vault.notifications = list.filter((row) => String(row.id) !== String(note.id));
    return '';
  }));
}

export async function dropReadNotes(req, res) {
  reply(res, await editVault(req, (vault) => {
    vault.notifications = rows(vault, 'notifications').filter((row) => num(row.read) !== 1);
    return '';
  }));
}

function pinPair(pin) {
  const salt = randomBytes(16).toString('base64url');
  return { pin_salt: salt, pin_hash: stretchPin(pin, salt) };
}

export async function addEmployee(req, res) {
  const name = String(req.body?.name || '').trim().slice(0, 40);
  const pin = String(req.body?.pin || '');
  if (name.length < 2) return res.status(400).json({ error: true, message: 'Weka jina la muuzaji.' });
  if (!/^\d{4}$/.test(pin)) return res.status(400).json({ error: true, message: 'PIN iwe tarakimu 4.' });
  reply(res, await editVault(req, (vault) => {
    if (!Array.isArray(vault.staff)) vault.staff = [];
    if (vault.staff.some((row) => String(row.name).toLowerCase() === name.toLowerCase())) return 'Jina hili tayari lipo.';
    vault.staff.push({
      id: freshId(), name, role: 'EMPLOYEE', ...pinPair(pin), pin_fails: 0, pin_locked_until: '',
      perm_stock: 1, perm_cost: 0, perm_history: 0, perm_debts: 1, perm_customers: 1, perm_reports: 0, perm_edit: 0, perm_analysis: 0,
      photo: '', active: 1, created_at: new Date().toISOString(),
    });
    pushNote(vault, 'Muuzaji mpya', `${actor(req)} · ${name}`, `AUDIT:STAFF:${name}`);
    return '';
  }));
}

export async function resetEmployeePin(req, res) {
  const pin = String(req.body?.pin || '');
  if (!/^\d{4}$/.test(pin)) return res.status(400).json({ error: true, message: 'PIN iwe tarakimu 4.' });
  reply(res, await editVault(req, (vault) => {
    const person = rows(vault, 'staff').find((row) => String(row.id) === String(req.params.id));
    if (!person) return 'Akaunti haipo.';
    if (person.role === 'OWNER') return 'Badilisha PIN yako kwenye sehemu ya PIN yangu.';
    Object.assign(person, pinPair(pin), { pin_fails: 0, pin_locked_until: '' });
    pushNote(vault, 'PIN imebadilika', `${actor(req)} · ${person.name}`, `AUDIT:PIN:${person.id}`);
    return '';
  }));
}

export async function saveAccess(req, res) {
  const flags = req.body?.perms || {};
  const keys = ['stock', 'cost', 'history', 'debts', 'customers', 'reports', 'edit', 'analysis'];
  reply(res, await editVault(req, (vault) => {
    const person = rows(vault, 'staff').find((row) => String(row.id) === String(req.params.id));
    if (!person) return 'Akaunti haipo.';
    if (person.role === 'OWNER') return 'Mmiliki ana sehemu zote.';
    for (const key of keys) person[`perm_${key}`] = flags[key] ? 1 : 0;
    pushNote(vault, 'Ruhusa', `${actor(req)} · ${person.name}`, `AUDIT:PERM:${person.id}`);
    return '';
  }));
}

export async function exportVault(req, res) {
  const loaded = await vaultFrom(req);
  if (loaded.error) return res.status(400).json({ error: true, message: loaded.error });
  const copy = JSON.parse(JSON.stringify(loaded.vault));
  if (Array.isArray(copy.meta)) copy.meta = copy.meta.filter((row) => !String(row.key || '').includes('token'));
  res.setHeader('Content-Disposition', 'attachment; filename="phonevault-nakala.json"');
  res.json(copy);
}

export async function importVault(req, res) {
  if (req.body?.confirm !== 'RUDISHA') return res.status(400).json({ error: true, message: 'Andika RUDISHA kuthibitisha.' });
  const snapshot = req.body?.snapshot;
  if (!snapshot || (!Array.isArray(snapshot.products) && !Array.isArray(snapshot.sales))) {
    return res.status(400).json({ error: true, message: 'Faili si daftari la PhoneVault.' });
  }
  const loaded = await vaultFrom(req);
  if (loaded.error) return res.status(400).json({ error: true, message: loaded.error });
  snapshot.revision = num(loaded.vault.revision) + 1;
  if (Array.isArray(snapshot.meta)) snapshot.meta = snapshot.meta.filter((row) => !String(row.key || '').includes('token'));
  const saved = await keepVault(req, loaded.target, snapshot);
  if (saved) return res.status(400).json({ error: true, message: saved });
  res.json({ success: true });
}

export async function shopFaces(req, res) {
  const loaded = await vaultFrom(req);
  if (loaded.error) return res.status(400).json({ error: true, message: loaded.error });
  const meta = {};
  for (const row of rows(loaded.vault, 'meta')) meta[row.key] = row.value ?? '';
  const staff = rows(loaded.vault, 'staff')
    .filter((person) => num(person.active) !== 0)
    .map((person) => ({
      id: person.id,
      name: person.name,
      role: person.role,
      photo: String(person.photo || ''),
    }));
  res.json({
    success: true,
    data: { name: meta.shop_name || 'PhoneVault', logo: meta.shop_logo || '', staff },
  });
}

export async function enterStaff(req, res) {
  const id = String(req.body?.id || '');
  const pin = String(req.body?.pin || '').replace(/\D/g, '');
  if (!/^\d{4}$/.test(pin)) return res.status(400).json({ error: true, message: 'PIN iwe tarakimu 4.' });
  const loaded = await vaultFrom(req);
  if (loaded.error) return res.status(400).json({ error: true, message: loaded.error });
  const person = rows(loaded.vault, 'staff').find((row) => String(row.id) === id && num(row.active) !== 0);
  if (!person) return res.status(404).json({ error: true, message: 'Akaunti haipo.' });
  const lockedUntil = Date.parse(person.pin_locked_until || '');
  if (Number.isFinite(lockedUntil) && lockedUntil > Date.now()) {
    const left = Math.max(1, Math.round((lockedUntil - Date.now()) / 1000));
    return res.status(400).json({ error: true, message: `Subiri sekunde ${left}.` });
  }
  if (!pinMatches(person, pin)) {
    await editVault(req, (vault) => {
      const row = rows(vault, 'staff').find((item) => String(item.id) === id);
      if (!row) return 'Akaunti haipo.';
      const fails = num(row.pin_fails) + 1;
      const wait = fails >= 15 ? 1800 : fails >= 10 ? 300 : fails >= 5 ? 60 : 0;
      row.pin_fails = fails;
      row.pin_locked_until = wait ? new Date(Date.now() + wait * 1000).toISOString() : '';
      return '';
    });
    return res.status(401).json({ error: true, message: 'PIN si sahihi.' });
  }
  await editVault(req, (vault) => {
    const row = rows(vault, 'staff').find((item) => String(item.id) === id);
    if (!row) return 'Akaunti haipo.';
    row.pin_fails = 0;
    row.pin_locked_until = '';
    if (row.role !== 'OWNER') pushNote(vault, 'Muuzaji ameingia', `${row.name} amefungua duka.`, `STAFF:${row.id}:${Date.now()}`);
    return '';
  });
  const owner = person.role === 'OWNER';
  const on = (key) => owner || num(person[key]) !== 0;
  res.json({
    success: true,
    data: {
      id: person.id,
      name: person.name,
      role: person.role,
      photo: String(person.photo || ''),
      token: signStaff(person),
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
    },
  });
}
