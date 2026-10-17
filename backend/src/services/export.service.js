import ExcelJS from 'exceljs';
import prisma from '../prisma.js';

function dateRange(query) {
  const where = {};
  if (query.from || query.to) {
    where.createdAt = {};
    if (query.from) where.createdAt.gte = new Date(query.from);
    if (query.to) {
      const end = new Date(query.to);
      end.setHours(23, 59, 59, 999);
      where.createdAt.lte = end;
    }
  }
  return where;
}

export async function loadSales(query) {
  return prisma.sale.findMany({
    where: dateRange(query),
    include: {
      items: true,
      payments: true,
      customer: true,
      cashier: { select: { name: true } },
    },
    orderBy: { createdAt: 'asc' },
  });
}

function csvCell(value) {
  const text = value == null ? '' : String(value);
  if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

export function salesToCsv(sales) {
  const header = [
    'invoice', 'date', 'cashier', 'customer', 'phone', 'status', 'currency',
    'subtotal', 'discount', 'tax', 'grand_total', 'paid', 'change',
    'payments', 'items', 'origin', 'cloud_synced',
  ];
  const lines = [header.join(',')];
  for (const sale of sales) {
    const payments = (sale.payments || []).map((p) => `${p.method}:${p.amount}${p.referenceCode ? `(${p.referenceCode})` : ''}`).join(' | ');
    const items = (sale.items || []).map((item) => {
      const name = item.productNameSnapshot || item.productId;
      const imei = item.imeiSnapshot ? ` IMEI ${item.imeiSnapshot}` : '';
      return `${name} x${item.quantity}${imei}`;
    }).join(' | ');
    lines.push([
      sale.invoiceNumber,
      sale.createdAt.toISOString(),
      sale.cashier?.name || '',
      sale.customer?.name || '',
      sale.customer?.phone || '',
      sale.status,
      sale.currency,
      sale.subtotal,
      sale.discountTotal,
      sale.taxAmount,
      sale.grandTotal,
      sale.amountPaid,
      sale.changeDue,
      payments,
      items,
      sale.origin,
      sale.cloudSyncedAt ? sale.cloudSyncedAt.toISOString() : 'PENDING',
    ].map(csvCell).join(','));
  }
  return `\uFEFF${lines.join('\n')}\n`;
}

export async function salesToXlsx(sales) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'PhoneVault POS';
  const sheet = workbook.addWorksheet('Mauzo');
  sheet.columns = [
    { header: 'Invoice', key: 'invoice', width: 22 },
    { header: 'Tarehe', key: 'date', width: 22 },
    { header: 'Keshia', key: 'cashier', width: 18 },
    { header: 'Mteja', key: 'customer', width: 22 },
    { header: 'Simu', key: 'phone', width: 16 },
    { header: 'Hali', key: 'status', width: 14 },
    { header: 'Sarafu', key: 'currency', width: 10 },
    { header: 'Jumla', key: 'total', width: 14 },
    { header: 'Malipo', key: 'payments', width: 28 },
    { header: 'Bidhaa', key: 'items', width: 42 },
    { header: 'Cloud', key: 'cloud', width: 14 },
  ];
  sheet.getRow(1).font = { bold: true };
  for (const sale of sales) {
    sheet.addRow({
      invoice: sale.invoiceNumber,
      date: sale.createdAt.toISOString().slice(0, 16).replace('T', ' '),
      cashier: sale.cashier?.name || '',
      customer: sale.customer?.name || 'Walk-in',
      phone: sale.customer?.phone || '',
      status: sale.status,
      currency: sale.currency,
      total: sale.grandTotal,
      payments: (sale.payments || []).map((p) => `${p.method} ${p.amount}`).join(', '),
      items: (sale.items || []).map((item) => `${item.productNameSnapshot || 'Item'} x${item.quantity}`).join(', '),
      cloud: sale.cloudSyncedAt ? 'Synced' : 'Local only',
    });
  }
  const money = sheet.getColumn('total');
  money.numFmt = '#,##0';
  return workbook.xlsx.writeBuffer();
}
