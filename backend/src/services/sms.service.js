import prisma from '../prisma.js';

function digits(phone) {
  let value = String(phone || '').replace(/\D/g, '');
  if (value.startsWith('0') && value.length === 10) value = `255${value.slice(1)}`;
  if (value.length < 11 || value.length > 15) return '';
  return value;
}

function gatewayConfig() {
  return {
    provider: (process.env.SMS_PROVIDER || '').trim().toLowerCase(),
    key: (process.env.SMS_API_KEY || '').trim(),
    secret: (process.env.SMS_API_SECRET || '').trim(),
    sender: (process.env.SMS_SENDER_ID || '').trim(),
  };
}

async function postJson(url, config, body) {
  const token = Buffer.from(`${config.key}:${config.secret}`).toString('base64');
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(body),
  });
  const text = await response.text();
  if (!response.ok) throw new Error(text.slice(0, 240) || `HTTP ${response.status}`);
  return text;
}

async function dispatch(config, phone, message) {
  if (config.provider === 'beem') {
    return postJson('https://apisms.beem.africa/v1/send', config, {
      source_addr: config.sender,
      schedule_time: '',
      encoding: 0,
      message,
      recipients: [{ recipient_id: 1, dest_addr: phone }],
    });
  }
  if (config.provider === 'nextsms') {
    return postJson('https://messaging-service.co.tz/api/sms/v1/text/single', config, {
      from: config.sender,
      to: phone,
      text: message,
    });
  }
  throw new Error('SMS_PROVIDER iwe beem au nextsms.');
}

export async function sendShopSms({ recipient, message, type = 'CUSTOM' }) {
  const phone = digits(recipient);
  if (!phone || !message) return { status: 'SKIPPED' };
  const config = gatewayConfig();
  const ready = config.provider && config.key && config.secret && config.sender;
  try {
    if (!ready) {
      const row = await prisma.smsLog.create({
        data: { recipient: phone, message, type, status: 'WAITING_API' },
      });
      return { status: 'WAITING_API', data: row };
    }
    await dispatch(config, phone, message);
    const row = await prisma.smsLog.create({
      data: { recipient: phone, message, type, status: 'SENT' },
    });
    return { status: 'SENT', data: row };
  } catch (error) {
    const row = await prisma.smsLog.create({
      data: { recipient: phone, message: message.slice(0, 480), type, status: 'FAILED' },
    });
    return { status: 'FAILED', detail: error.message, data: row };
  }
}

export function receiptMessage(sale) {
  const lines = (sale.items || []).map((item) => {
    const name = item.productNameSnapshot || item.product?.name || 'Bidhaa';
    const months = item.phoneUnit?.warrantyMonths || item.warrantyMonths || 0;
    return months > 0 ? `${name} warranty miezi ${months}` : name;
  });
  const total = Number(sale.grandTotal) || 0;
  const paid = Math.min(Number(sale.amountPaid) || 0, total);
  const debt = Math.max(0, total - paid);
  return [
    `Risiti ${sale.invoiceNumber}.`,
    `Jumla TSH ${Math.round(total)}. Ymelipwa TSH ${Math.round(paid)}.`,
    debt > 0.5 ? `Deni TSH ${Math.round(debt)}.` : 'Deni hamna.',
    lines.length ? lines.join('. ') : '',
  ].filter(Boolean).join(' ');
}

export async function notifySale(sale) {
  const phone = sale.customer?.phone;
  if (!phone) return { status: 'SKIPPED' };
  return sendShopSms({
    recipient: phone,
    message: receiptMessage(sale),
    type: 'POS_RECEIPT',
  });
}
