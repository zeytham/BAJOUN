import prisma from '../prisma.js';
import { readUser } from '../middleware/auth.js';
import { findUserByPin } from '../services/pin.service.js';
import { attachDebt, saleBalance } from '../services/debt.service.js';
import { notifySale } from '../services/sms.service.js';

const pinAttempts = new Map();
function isPinRateLimited(key) {
  const now = Date.now();
  const bucket = (pinAttempts.get(key) || []).filter((time) => now - time < 5 * 60 * 1000);
  if (bucket.length >= 5) {
    pinAttempts.set(key, bucket);
    return true;
  }
  return false;
}
function recordFailedPin(key) {
  const now = Date.now();
  const bucket = (pinAttempts.get(key) || []).filter((time) => now - time < 5 * 60 * 1000);
  bucket.push(now);
  pinAttempts.set(key, bucket);
}

const saleInclude = {
  items: {
    include: {
      product: { include: { brand: true } },
      phoneUnit: true,
      variant: true,
    },
  },
  payments: true,
  customer: true,
  cashier: { select: { name: true, email: true } },
};


// Create Completed Sale or Proforma Invoice
export const createSale = async (req, res) => {
  try {
    const {
      customerId,
      customerData, // { name, phone, email, tinNumber }
      isProforma = false,
      currency = 'TSH',
      exchangeRate = 1.0,
      items, // Array of { productId, variantId, phoneUnitId, unitPrice, quantity, discount }
      discountTotal = 0,
      discountReason,
      payments, // Array of { method, amount, referenceCode }
      managerPin,
    } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: true, message: 'Cart items are required' });
    }

    const clientSaleId = req.body.clientSaleId || null;
    const deviceId = req.body.deviceId || req.get('x-device-id') || null;
    if (clientSaleId) {
      const existing = await prisma.sale.findUnique({
        where: { clientSaleId },
        include: saleInclude,
      });
      if (existing) {
        return res.status(200).json({
          success: true,
          idempotent: true,
          message: 'Sale already recorded',
          data: existing,
        });
      }
    }

    // 1. Get or Create Customer if provided
    let finalCustomerId = customerId || null;
    if (!finalCustomerId && customerData && customerData.phone) {
      const existingCust = await prisma.customer.findUnique({ where: { phone: customerData.phone } });
      if (existingCust) {
        finalCustomerId = existingCust.id;
      } else {
        const newCust = await prisma.customer.create({
          data: {
            name: customerData.name || 'Walk-in Customer',
            phone: customerData.phone,
            email: customerData.email || null,
            tinNumber: customerData.tinNumber || null,
          }
        });
        finalCustomerId = newCust.id;
      }
    }

    // 2. Validate Floor Price & Items Availability
    let calculatedSubtotal = 0;
    const validatedItems = [];

    for (const item of items) {
      let lineUnitPrice = parseFloat(item.unitPrice || 0);
      let itemDiscount = parseFloat(item.discount || 0);

      if (item.phoneUnitId) {
        const phoneUnit = await prisma.phoneUnit.findUnique({
          where: { id: item.phoneUnitId },
          include: { product: true }
        });

        if (!phoneUnit) {
          return res.status(404).json({ error: true, message: `Phone IMEI unit not found!` });
        }

        if (phoneUnit.status === 'SOLD' && !isProforma) {
          return res.status(400).json({ error: true, message: `Phone IMEI ${phoneUnit.imei1} is already SOLD!` });
        }

        // Floor Price Check
        const effectivePrice = lineUnitPrice - itemDiscount;
        if (effectivePrice < phoneUnit.minSellingPrice && !managerPin) {
          return res.status(403).json({
            error: true,
            requiresManagerOverride: true,
            message: `Selling price TSH ${effectivePrice.toLocaleString()} is below cashier floor limit of TSH ${phoneUnit.minSellingPrice.toLocaleString()} for ${phoneUnit.product.name} (IMEI: ${phoneUnit.imei1}). Manager PIN required!`
          });
        }

        validatedItems.push({
          productId: phoneUnit.productId,
          variantId: null,
          phoneUnitId: phoneUnit.id,
          unitPrice: lineUnitPrice,
          quantity: 1,
          discount: itemDiscount,
          lineTotal: effectivePrice,
          productNameSnapshot: phoneUnit.product?.name || null,
          imeiSnapshot: phoneUnit.imei1 || null,
        });

        calculatedSubtotal += lineUnitPrice;
      } else if (item.variantId) {
        const variant = await prisma.productVariant.findUnique({
          where: { id: item.variantId },
          include: { product: true },
        });
        if (!variant) {
          return res.status(404).json({ error: true, message: 'Variant not found' });
        }

        if (variant.stockQuantity < item.quantity && !isProforma) {
          return res.status(400).json({ error: true, message: `Insufficient stock for variant ${variant.color || ''} (${variant.stockQuantity} remaining)` });
        }

        const actualPrice = lineUnitPrice > 0 ? lineUnitPrice : variant.price;
        const effectiveTotal = (actualPrice - itemDiscount) * item.quantity;
        validatedItems.push({
          productId: variant.productId,
          variantId: variant.id,
          phoneUnitId: null,
          unitPrice: actualPrice,
          quantity: item.quantity,
          discount: itemDiscount,
          lineTotal: effectiveTotal,
          productNameSnapshot: variant.product?.name || null,
          imeiSnapshot: null,
        });

        calculatedSubtotal += actualPrice * item.quantity;
      } else {
        const product = await prisma.product.findUnique({
          where: { id: item.productId },
          include: { variants: true }
        });

        if (!product) {
          return res.status(404).json({ error: true, message: 'Product not found' });
        }

        let availableStock = 0;
        let targetVariantId = null;

        if (product.hasVariants && product.variants?.length > 0) {
          const firstInStockVar = product.variants.find(v => v.stockQuantity >= item.quantity) || product.variants[0];
          availableStock = firstInStockVar?.stockQuantity || 0;
          targetVariantId = firstInStockVar?.id || null;
          if (lineUnitPrice <= 0 && firstInStockVar) {
            lineUnitPrice = firstInStockVar.price;
          }
        } else {
          availableStock = product.stockQuantity || 0;
          if (lineUnitPrice <= 0) lineUnitPrice = product.basePrice || 0;
        }

        if (availableStock < item.quantity && !isProforma) {
          return res.status(400).json({ error: true, message: `Insufficient stock for ${product.name} (${availableStock} remaining)` });
        }

        const effectiveTotal = (lineUnitPrice - itemDiscount) * item.quantity;
        validatedItems.push({
          productId: product.id,
          variantId: targetVariantId,
          phoneUnitId: null,
          unitPrice: lineUnitPrice,
          quantity: item.quantity,
          discount: itemDiscount,
          lineTotal: effectiveTotal,
          productNameSnapshot: product.name,
          imeiSnapshot: null,
        });

        calculatedSubtotal += lineUnitPrice * item.quantity;
      }
    }

    // 3. Manager PIN Verification if required
    if (managerPin) {
      const manager = await findUserByPin(managerPin, { roles: ['ADMIN', 'MANAGER'] });
      if (!manager) {
        return res.status(401).json({ error: true, message: 'Invalid Manager PIN authorization code!' });
      }
    }

    // 4. Calculate Final Grand Total
    const finalGrandTotal = calculatedSubtotal - parseFloat(discountTotal);

    // 5. Process Payment Transactions & Calculate Change
    let totalPaid = 0;
    const validatedPayments = [];

    if (Array.isArray(payments)) {
      for (const p of payments) {
        const amt = parseFloat(p.amount);
        totalPaid += amt;
        validatedPayments.push({
          method: p.method || 'CASH',
          amount: amt,
          referenceCode: p.referenceCode || null,
        });
      }
    }

    const changeDue = Math.max(0, totalPaid - finalGrandTotal);
    const balanceDue = saleBalance(finalGrandTotal, totalPaid);
    const requestedInvoice = typeof req.body.invoiceNumber === 'string' ? req.body.invoiceNumber.trim() : '';
    const invoiceNumber = /^[A-Za-z0-9-]{8,40}$/.test(requestedInvoice)
      ? requestedInvoice
      : `INV-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;

    const authId = req.user?.id;
    let cashierUser = authId ? await prisma.user.findUnique({ where: { id: authId } }) : null;
    if (!cashierUser) {
      const authUser = readUser(req);
      if (authUser?.id) {
        cashierUser = await prisma.user.findUnique({ where: { id: authUser.id } });
      }
    }
    if (!cashierUser) {
      cashierUser = await prisma.user.findFirst({ where: { active: true } });
    }
    if (!cashierUser) {
      return res.status(401).json({ error: true, message: 'Hakuna akaunti ya cashier iliyopatikana kwenye mfumo.' });
    }

    // 6. Create Sale Record and Update Inventory Atomically in Prisma $transaction
    const sale = await prisma.$transaction(async (tx) => {
      // If Trade-In Voucher used, redeem voucher inside transaction
      for (const p of validatedPayments) {
        if (p.method === 'TRADEIN_VOUCHER' && p.referenceCode) {
          const voucher = await tx.tradeInVoucher.findUnique({ where: { code: p.referenceCode } });
          if (voucher && !voucher.isRedeemed) {
            await tx.tradeInVoucher.update({
              where: { id: voucher.id },
              data: { isRedeemed: true, redeemedAt: new Date() }
            });
          }
        }
      }

      const createdSale = await tx.sale.create({
        data: {
          invoiceNumber,
          cashierId: cashierUser.id,
          customerId: finalCustomerId,
          isProforma,
          currency,
          exchangeRate,
          subtotal: calculatedSubtotal,
          discountTotal: parseFloat(discountTotal),
          discountReason: discountReason || null,
          taxAmount: 0,
          grandTotal: finalGrandTotal,
          amountPaid: totalPaid,
          changeDue,
          status: isProforma ? 'PROFORMA_QUOTE' : balanceDue > 0.5 ? 'PARTIAL' : 'COMPLETED',
          clientSaleId,
          deviceId,
          origin: deviceId ? 'DEVICE' : 'COUNTER',
          items: {
            create: validatedItems,
          },
          payments: {
            create: validatedPayments,
          },
        },
        include: saleInclude,
      });

      // Update Inventory (Mark Phone IMEIs as SOLD & Reduce Accessory Stock)
      if (!isProforma) {
        for (const item of validatedItems) {
          if (item.phoneUnitId) {
            await tx.phoneUnit.update({
              where: { id: item.phoneUnitId },
              data: { status: 'SOLD' }
            });
          } else if (item.variantId) {
            await tx.productVariant.update({
              where: { id: item.variantId },
              data: { stockQuantity: { decrement: item.quantity } }
            });
          } else if (item.productId) {
            await tx.product.update({
              where: { id: item.productId },
              data: { stockQuantity: { decrement: item.quantity } }
            });
          }
        }

        // Update Customer Total Spent
        if (finalCustomerId) {
          await tx.customer.update({
            where: { id: finalCustomerId },
            data: { totalSpent: { increment: finalGrandTotal } }
          });
        }
        if (balanceDue > 0.5) {
          const buyer = finalCustomerId
            ? await tx.customer.findUnique({ where: { id: finalCustomerId } })
            : null;
          await attachDebt(tx, {
            saleId: createdSale.id,
            customerId: finalCustomerId,
            customerName: buyer?.name || customerData?.name || 'Walk-in',
            customerPhone: buyer?.phone || customerData?.phone || '',
            principal: balanceDue,
            invoiceNumber,
          });
        }
      }

      return createdSale;
    });

    if (deviceId) {
      await prisma.syncDevice.upsert({
        where: { id: deviceId },
        update: { lastSeenAt: new Date() },
        create: { id: deviceId, label: 'Shop till' },
      }).catch(() => {});
    }

    if (!isProforma) notifySale(sale).catch(() => {});

    res.status(201).json({
      success: true,
      message: isProforma ? 'Proforma Invoice generated successfully' : 'Sale completed successfully',
      data: sale
    });
  } catch (error) {
    res.status(500).json({ error: true, message: error.message });
  }
};

// Verify Manager 4-Digit PIN Override
export const verifyManagerPin = async (req, res) => {
  try {
    const { pin } = req.body;
    const clientKey = req.ip || req.user?.id || 'client';
    if (isPinRateLimited(clientKey)) {
      return res.status(429).json({ error: true, message: 'Majaribio mengi ya PIN yasiyo sahihi. Subiri dakika 5.' });
    }

    const manager = await findUserByPin(pin, { roles: ['ADMIN', 'MANAGER'] });

    if (!manager) {
      recordFailedPin(clientKey);
      return res.status(401).json({ error: true, message: 'Invalid Manager PIN authorization code!' });
    }

    res.json({ success: true, message: 'Manager PIN authorized', managerName: manager.name });
  } catch (error) {
    res.status(500).json({ error: true, message: error.message });
  }
};

// Simulate M-Pesa STK Push Payment
export const simulateStkPush = async (req, res) => {
  try {
    const { phone, amount } = req.body;
    const refCode = `QX${Math.floor(10000000 + Math.random() * 90000000)}`;

    res.json({
      success: true,
      message: `STK Push sent to ${phone} for TSH ${parseFloat(amount).toLocaleString()}. Payment confirmed!`,
      referenceCode: refCode,
    });
  } catch (error) {
    res.status(500).json({ error: true, message: error.message });
  }
};

// Verify Trade-In Voucher Code
export const verifyTradeInVoucher = async (req, res) => {
  try {
    const { code } = req.params;
    const voucher = await prisma.tradeInVoucher.findUnique({
      where: { code },
      include: { customer: true }
    });

    if (!voucher) {
      return res.status(404).json({ error: true, message: 'Trade-In Voucher code not found' });
    }

    if (voucher.isRedeemed) {
      return res.status(400).json({ error: true, message: 'Trade-In Voucher has already been redeemed!' });
    }

    res.json({ success: true, data: voucher });
  } catch (error) {
    res.status(500).json({ error: true, message: error.message });
  }
};

// Get Full Receipt Payload for Printing
export const getReceiptPayload = async (req, res) => {
  try {
    const { id } = req.params;
    const sale = await prisma.sale.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: { include: { brand: true, category: true } },
            phoneUnit: true,
            variant: true,
          }
        },
        payments: true,
        customer: true,
        cashier: { select: { name: true, email: true } }
      }
    });

    if (!sale) {
      return res.status(404).json({ error: true, message: 'Invoice sale not found' });
    }

    res.json({ success: true, data: sale });
  } catch (error) {
    res.status(500).json({ error: true, message: error.message });
  }
};

// Cashier Shift Open & Close (Z-Report Reconciliation)
export const manageShift = async (req, res) => {
  try {
    const { action, openingFloat, actualCash } = req.body;
    const authId = req.user?.id;
    const cashier = authId
      ? await prisma.user.findUnique({ where: { id: authId } })
      : await prisma.user.findFirst({ where: { active: true } });

    if (!cashier) {
      return res.status(401).json({ error: true, message: 'Mtumiaji wa zamu (shift) hajapatikana.' });
    }

    if (action === 'OPEN') {
      const existingOpen = await prisma.cashShift.findFirst({
        where: { cashierId: cashier.id, status: 'OPEN' }
      });
      if (existingOpen) {
        return res.json({ success: true, message: 'Una zamu iliyo wazi tayari.', data: existingOpen });
      }

      const shift = await prisma.cashShift.create({
        data: {
          cashierId: cashier.id,
          openingFloat: parseFloat(openingFloat || 100000),
          status: 'OPEN',
        }
      });
      return res.json({ success: true, message: 'Shift opened successfully', data: shift });
    }

    if (action === 'CLOSE') {
      const activeShift = await prisma.cashShift.findFirst({
        where: { cashierId: cashier.id, status: 'OPEN' },
        include: { sales: { include: { payments: true } } }
      });

      if (!activeShift) {
        return res.status(404).json({ error: true, message: 'No active shift found to close' });
      }

      // Calculate total cash collected in shift
      let shiftCashSales = 0;
      activeShift.sales.forEach(s => {
        s.payments.forEach(p => {
          if (p.method === 'CASH') shiftCashSales += p.amount;
        });
      });

      const expectedCash = activeShift.openingFloat + shiftCashSales;
      const countedCash = parseFloat(actualCash || expectedCash);
      const variance = countedCash - expectedCash;

      const closedShift = await prisma.cashShift.update({
        where: { id: activeShift.id },
        data: {
          status: 'CLOSED',
          expectedCash,
          actualCash: countedCash,
          variance,
          closedAt: new Date(),
        }
      });

      return res.json({
        success: true,
        message: 'Shift closed successfully (Z-Report generated)',
        data: closedShift
      });
    }

    res.status(400).json({ error: true, message: 'Invalid shift action' });
  } catch (error) {
    res.status(500).json({ error: true, message: error.message });
  }
};
