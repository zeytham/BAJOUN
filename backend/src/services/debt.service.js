import prisma from '../prisma.js';

export function saleBalance(grandTotal, amountPaid) {
  const total = Number(grandTotal) || 0;
  const paid = Math.min(Number(amountPaid) || 0, total);
  return Math.max(0, total - paid);
}

export async function attachDebt(client, { saleId, customerId, customerName, customerPhone, principal, invoiceNumber }) {
  const amount = Number(principal) || 0;
  if (amount <= 0.5) return null;
  const existing = await client.debt.findFirst({ where: { saleId } });
  if (existing) return existing;
  return client.debt.create({
    data: {
      saleId,
      customerId: customerId || null,
      customerName: customerName || 'Walk-in',
      customerPhone: customerPhone || '',
      invoiceNumber: invoiceNumber || '',
      principal: amount,
      balance: amount,
      status: 'OPEN',
    },
  });
}

export async function syncVaultDebts(snapshot) {
  const debts = Array.isArray(snapshot?.debts) ? snapshot.debts : [];
  const payments = Array.isArray(snapshot?.debt_payments) ? snapshot.debt_payments : [];
  const sales = Array.isArray(snapshot?.sales) ? snapshot.sales : [];
  const invoiceOf = new Map(sales.map((sale) => [String(sale.id), sale.invoice || sale.invoice_number || '']));

  for (const debt of debts) {
    if (!debt?.id) continue;
    const sourceSaleId = String(debt.sale_id || '');
    const linked = sourceSaleId
      ? await prisma.sale.findFirst({
          where: { OR: [{ id: sourceSaleId }, { clientSaleId: sourceSaleId }, { invoiceNumber: invoiceOf.get(sourceSaleId) || '__none__' }] },
        })
      : null;
    const data = {
      customerName: String(debt.customer_name || 'Walk-in'),
      customerPhone: String(debt.customer_phone || ''),
      invoiceNumber: invoiceOf.get(sourceSaleId) || '',
      principal: Number(debt.principal) || 0,
      balance: Number(debt.balance) || 0,
      status: debt.status || 'OPEN',
      openedAt: debt.opened_at ? new Date(debt.opened_at) : new Date(),
      saleId: linked?.id || null,
      sourceSaleId,
    };
    if (Number.isNaN(data.openedAt.getTime())) data.openedAt = new Date();
    await prisma.debt.upsert({
      where: { id: String(debt.id) },
      create: { id: String(debt.id), ...data },
      update: data,
    });
  }

  for (const payment of payments) {
    if (!payment?.id || !payment.debt_id) continue;
    const debt = await prisma.debt.findUnique({ where: { id: String(payment.debt_id) } });
    if (!debt) continue;
    const paidAt = payment.created_at ? new Date(payment.created_at) : new Date();
    const data = {
      debtId: debt.id,
      amount: Number(payment.amount) || 0,
      method: payment.method || 'CASH',
      note: payment.note || '',
      cashierName: payment.cashier_name || '',
      paidAt: Number.isNaN(paidAt.getTime()) ? new Date() : paidAt,
    };
    await prisma.debtPayment.upsert({
      where: { id: String(payment.id) },
      create: { id: String(payment.id), ...data },
      update: data,
    });
  }
}
