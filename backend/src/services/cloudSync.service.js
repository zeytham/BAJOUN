import prisma from '../prisma.js';
import { attachDebt, saleBalance } from './debt.service.js';
import { notifySale } from './sms.service.js';

function cloudBase() {
  const url = (process.env.CLOUD_API_URL || '').trim().replace(/\/$/, '');
  return url;
}

async function ensureImportedProduct(item) {
  const existing = await prisma.product.findUnique({ where: { id: item.productId } });
  if (existing) return existing;
  let category = await prisma.category.findFirst({ where: { slug: 'imported' } });
  if (!category) {
    category = await prisma.category.create({
      data: {
        name: 'Imported from shop',
        slug: 'imported',
        description: 'Catalog rows created so an offline sale can land when the cloud copy did not have the product yet.',
      },
    });
  }
  return prisma.product.create({
    data: {
      id: item.productId,
      name: item.productNameSnapshot || 'Imported item',
      type: item.imeiSnapshot ? 'PHONE' : 'ACCESSORY',
      categoryId: category.id,
      basePrice: item.unitPrice,
      stockQuantity: 0,
    },
  });
}

async function resolveCashier() {
  const admin = await prisma.user.findFirst({ where: { role: 'ADMIN', active: true } });
  if (admin) return admin;
  const anyUser = await prisma.user.findFirst();
  if (anyUser) return anyUser;
  throw new Error('Cloud shop has no user to attach synced sales');
}

export async function ingestRemoteSale(sale) {
  const clientSaleId = sale.clientSaleId || sale.id;
  const existing = await prisma.sale.findFirst({
    where: { OR: [{ clientSaleId }, { invoiceNumber: sale.invoiceNumber }] },
  });
  if (existing) return { idempotent: true, id: existing.id };

  const cashier = await resolveCashier();
  let customerId = null;
  if (sale.customer?.phone) {
    const found = await prisma.customer.findUnique({ where: { phone: sale.customer.phone } });
    if (found) customerId = found.id;
    else {
      const created = await prisma.customer.create({
        data: {
          name: sale.customer.name || 'Walk-in Customer',
          phone: sale.customer.phone,
          email: sale.customer.email || null,
        },
      });
      customerId = created.id;
    }
  }

  const items = [];
  for (const item of sale.items || []) {
    await ensureImportedProduct(item);
    let phoneUnitId = null;
    if (item.phoneUnitId) {
      const unit = await prisma.phoneUnit.findUnique({ where: { id: item.phoneUnitId } });
      phoneUnitId = unit ? unit.id : null;
    }
    let variantId = null;
    if (item.variantId) {
      const variant = await prisma.productVariant.findUnique({ where: { id: item.variantId } });
      variantId = variant ? variant.id : null;
    }
    items.push({
      productId: item.productId,
      variantId,
      phoneUnitId,
      unitPrice: item.unitPrice,
      quantity: item.quantity,
      discount: item.discount || 0,
      lineTotal: item.lineTotal,
      productNameSnapshot: item.productNameSnapshot || null,
      imeiSnapshot: item.imeiSnapshot || null,
    });
  }

  const created = await prisma.sale.create({
    data: {
      invoiceNumber: sale.invoiceNumber,
      cashierId: cashier.id,
      customerId,
      isProforma: Boolean(sale.isProforma),
      currency: sale.currency || 'TSH',
      exchangeRate: sale.exchangeRate || 1,
      subtotal: sale.subtotal,
      discountTotal: sale.discountTotal || 0,
      discountReason: sale.discountReason || null,
      taxAmount: sale.taxAmount || 0,
      grandTotal: sale.grandTotal,
      amountPaid: sale.amountPaid,
      changeDue: sale.changeDue || 0,
      status: sale.isProforma ? 'PROFORMA_QUOTE' : saleBalance(sale.grandTotal, sale.amountPaid) > 0.5 ? 'PARTIAL' : (sale.status || 'COMPLETED'),
      clientSaleId,
      deviceId: sale.deviceId || null,
      origin: 'DEVICE',
      cloudSyncedAt: new Date(),
      items: { create: items },
      payments: {
        create: (sale.payments || []).map((payment) => ({
          method: payment.method,
          amount: payment.amount,
          referenceCode: payment.referenceCode || null,
        })),
      },
    },
  });
  const balance = saleBalance(sale.grandTotal, sale.amountPaid);
  if (!sale.isProforma && balance > 0.5) {
    await attachDebt(prisma, {
      saleId: created.id,
      customerId,
      customerName: sale.customer?.name,
      customerPhone: sale.customer?.phone,
      principal: balance,
      invoiceNumber: sale.invoiceNumber,
    });
  }
  if (sale.customer?.phone) {
    notifySale({
      ...created,
      customer: sale.customer,
      items: sale.items,
    }).catch(() => {});
  }
  return { idempotent: false, id: created.id };
}

export async function pushUnsyncedSales() {
  const base = cloudBase();
  if (!base || process.env.IS_CLOUD === 'true') {
    const pending = await prisma.sale.count({ where: { cloudSyncedAt: null, isProforma: false } });
    return {
      skipped: true,
      pending,
      reason: process.env.IS_CLOUD === 'true'
        ? 'This server is the cloud copy.'
        : 'CLOUD_API_URL is not set. Sales stay in the shop SQLite file until you add the hosting address.',
    };
  }

  const token = process.env.SYNC_TOKEN || '';
  const batch = await prisma.sale.findMany({
    where: { cloudSyncedAt: null, isProforma: false },
    include: { items: true, payments: true, customer: true },
    orderBy: { createdAt: 'asc' },
    take: 40,
  });

  let sent = 0;
  let failed = 0;
  for (const sale of batch) {
    try {
      const response = await fetch(`${base}/api/sync/ingest`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'X-Sync-Token': token } : {}),
        },
        body: JSON.stringify({ sale }),
      });
      if (!response.ok) {
        const text = await response.text();
        throw new Error(text.slice(0, 240) || `HTTP ${response.status}`);
      }
      await prisma.sale.update({
        where: { id: sale.id },
        data: { cloudSyncedAt: new Date(), cloudSyncError: null },
      });
      sent += 1;
    } catch (error) {
      failed += 1;
      await prisma.sale.update({
        where: { id: sale.id },
        data: { cloudSyncError: error.message.slice(0, 400) },
      });
    }
  }

  const pending = await prisma.sale.count({ where: { cloudSyncedAt: null, isProforma: false } });
  return { skipped: false, sent, failed, pending };
}

export async function syncStatus() {
  const [pending, lastBackup, devices] = await Promise.all([
    prisma.sale.count({ where: { cloudSyncedAt: null, isProforma: false } }),
    prisma.backupRun.findFirst({ orderBy: { createdAt: 'desc' } }),
    prisma.syncDevice.count(),
  ]);
  return {
    engine: 'sqlite',
    cloudConfigured: Boolean(cloudBase()) && process.env.IS_CLOUD !== 'true',
    isCloud: process.env.IS_CLOUD === 'true',
    pendingCloudSales: pending,
    pairedDevices: devices,
    lastBackup: lastBackup
      ? {
          tier: lastBackup.tier,
          status: lastBackup.status,
          restoreStatus: lastBackup.restoreStatus,
          createdAt: lastBackup.createdAt,
          fileName: lastBackup.fileName,
        }
      : null,
  };
}
