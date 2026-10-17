import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

/**
 * GET /api/forecasting/velocity
 * Units sold per day, and days of stock left.
 */
export const getSalesVelocity = async (req, res) => {
  try {
    const periodDays = parseInt(req.query.days || '30', 10);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - periodDays);

    const products = await prisma.product.findMany({
      include: {
        category: true,
        brand: true,
        variants: true,
        phoneUnits: {
          where: { status: 'IN_STOCK' },
        },
        saleItems: {
          where: {
            sale: {
              createdAt: { gte: startDate },
              status: 'COMPLETED',
            },
          },
        },
      },
    });

    const velocityData = products.map((prod) => {
      const totalUnitsSold = prod.saleItems.reduce((acc, item) => acc + item.quantity, 0);
      const dailyVelocityRate = Number((totalUnitsSold / periodDays).toFixed(2));

      let currentStock = 0;
      if (prod.type === 'PHONE') {
        currentStock = prod.phoneUnits.length;
      } else if (prod.hasVariants && prod.variants.length > 0) {
        currentStock = prod.variants.reduce((acc, v) => acc + (v.stockQuantity || 0), 0);
      } else {
        currentStock = prod.stockQuantity || 0;
      }

      let daysRemaining = dailyVelocityRate > 0 ? Math.round(currentStock / dailyVelocityRate) : 999;
      if (daysRemaining > 999) daysRemaining = 999;

      let status = 'HEALTHY';
      let recommendedReorder = 0;

      const targetDaysCoverage = 30;
      if (currentStock <= (prod.reorderLevel || 5) || daysRemaining <= 7) {
        status = 'CRITICAL_STOCKOUT_RISK';
        recommendedReorder = Math.max(Math.ceil(dailyVelocityRate * targetDaysCoverage) - currentStock, 10);
      } else if (daysRemaining <= 14) {
        status = 'REORDER_NEEDED';
        recommendedReorder = Math.max(Math.ceil(dailyVelocityRate * targetDaysCoverage) - currentStock, 5);
      }

      return {
        id: prod.id,
        name: prod.name,
        type: prod.type,
        sku: prod.sku || 'N/A',
        category: prod.category?.name || 'Uncategorized',
        brand: prod.brand?.name || 'Generic',
        currentStock,
        reorderLevel: prod.reorderLevel || 5,
        totalUnitsSold,
        periodDays,
        dailyVelocityRate,
        daysRemaining,
        status,
        recommendedReorder,
        unitPrice: prod.basePrice || 0,
      };
    });

    velocityData.sort((a, b) => a.daysRemaining - b.daysRemaining);

    return res.json({
      success: true,
      periodDays,
      data: velocityData,
    });
  } catch (error) {
    console.error('Error fetching sales velocity:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/forecasting/abc-matrix
 * ABC Inventory Analysis & Dead-Stock Classification
 */
export const getAbcMatrix = async (req, res) => {
  try {
    const daysWindow = 60;
    const windowStart = new Date();
    windowStart.setDate(windowStart.getDate() - daysWindow);

    const products = await prisma.product.findMany({
      include: {
        category: true,
        brand: true,
        variants: true,
        phoneUnits: {
          where: { status: 'IN_STOCK' },
        },
        saleItems: {
          include: {
            sale: true,
          },
        },
      },
    });

    const productStats = products.map((prod) => {
      let revenue = 0;
      let latestSaleDate = null;

      prod.saleItems.forEach((item) => {
        if (item.sale && item.sale.status === 'COMPLETED') {
          revenue += item.lineTotal || 0;
          const sDate = new Date(item.sale.createdAt);
          if (!latestSaleDate || sDate > latestSaleDate) {
            latestSaleDate = sDate;
          }
        }
      });

      let currentStock = 0;
      let unitCost = prod.costPrice || prod.basePrice || 0;
      if (prod.type === 'PHONE') {
        currentStock = prod.phoneUnits.length;
        if (prod.phoneUnits.length > 0) {
          unitCost = prod.phoneUnits[0].buyingPrice || unitCost;
        }
      } else if (prod.hasVariants && prod.variants.length > 0) {
        currentStock = prod.variants.reduce((acc, v) => acc + (v.stockQuantity || 0), 0);
      } else {
        currentStock = prod.stockQuantity || 0;
      }

      const tiedUpCapital = currentStock * unitCost;
      const daysSinceLastSale = latestSaleDate
        ? Math.floor((new Date() - latestSaleDate) / (1000 * 60 * 60 * 24))
        : 999;

      return {
        id: prod.id,
        name: prod.name,
        type: prod.type,
        category: prod.category?.name || 'General',
        brand: prod.brand?.name || 'Generic',
        revenue,
        currentStock,
        tiedUpCapital,
        daysSinceLastSale,
        isDeadStock: currentStock > 0 && daysSinceLastSale >= 45,
      };
    });

    productStats.sort((a, b) => b.revenue - a.revenue);

    const totalRevenue = productStats.reduce((acc, p) => acc + p.revenue, 0);

    let runningRevenue = 0;
    const classifiedProducts = productStats.map((p) => {
      runningRevenue += p.revenue;
      const cumulativeRatio = totalRevenue > 0 ? runningRevenue / totalRevenue : 1;

      let abcClass = 'C';
      if (cumulativeRatio <= 0.8) {
        abcClass = 'A';
      } else if (cumulativeRatio <= 0.95) {
        abcClass = 'B';
      }

      return {
        ...p,
        abcClass,
      };
    });

    const summary = {
      totalProducts: classifiedProducts.length,
      classACount: classifiedProducts.filter((p) => p.abcClass === 'A').length,
      classBCount: classifiedProducts.filter((p) => p.abcClass === 'B').length,
      classCCount: classifiedProducts.filter((p) => p.abcClass === 'C').length,
      deadStockCount: classifiedProducts.filter((p) => p.isDeadStock).length,
      deadStockCapitalTiedUp: classifiedProducts
        .filter((p) => p.isDeadStock)
        .reduce((acc, p) => acc + p.tiedUpCapital, 0),
    };

    return res.json({
      success: true,
      summary,
      data: classifiedProducts,
    });
  } catch (error) {
    console.error('Error fetching ABC matrix:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/forecasting/suppliers
 */
export const getSuppliers = async (req, res) => {
  try {
    const suppliers = await prisma.supplier.findMany({
      include: {
        purchaseOrders: true,
      },
      orderBy: { name: 'asc' },
    });
    return res.json({ success: true, data: suppliers });
  } catch (error) {
    console.error('Error fetching suppliers:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /api/forecasting/suppliers
 */
export const createSupplier = async (req, res) => {
  try {
    const { name, contactPerson, phone, email, address, brandSupplied, leadTimeDays, paymentTerms } = req.body;
    if (!name || !phone) {
      return res.status(400).json({ success: false, message: 'Supplier Name and Phone are required' });
    }

    const supplier = await prisma.supplier.create({
      data: {
        name,
        contactPerson,
        phone,
        email,
        address,
        brandSupplied,
        leadTimeDays: leadTimeDays ? parseInt(leadTimeDays, 10) : 3,
        paymentTerms: paymentTerms || 'NET_30',
      },
    });

    return res.status(201).json({ success: true, data: supplier });
  } catch (error) {
    console.error('Error creating supplier:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/forecasting/purchase-orders
 */
export const getPurchaseOrders = async (req, res) => {
  try {
    const pos = await prisma.purchaseOrder.findMany({
      include: {
        supplier: true,
        items: {
          include: {
            product: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return res.json({ success: true, data: pos });
  } catch (error) {
    console.error('Error fetching POs:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /api/forecasting/purchase-orders
 * Create new PO (PO-2026-XXXX)
 */
export const createPurchaseOrder = async (req, res) => {
  try {
    const { supplierId, expectedDelivery, notes, items } = req.body;
    if (!supplierId || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Supplier and at least 1 item are required' });
    }

    const poCount = await prisma.purchaseOrder.count();
    const poNumber = `PO-2026-${String(poCount + 101).padStart(4, '0')}`;

    let totalAmount = 0;
    const poItemsData = items.map((item) => {
      const lineTotal = (item.unitCost || 0) * (item.quantityOrdered || 1);
      totalAmount += lineTotal;
      return {
        productId: item.productId,
        variantId: item.variantId || null,
        quantityOrdered: parseInt(item.quantityOrdered, 10) || 1,
        unitCost: parseFloat(item.unitCost) || 0,
        totalCost: lineTotal,
      };
    });

    const po = await prisma.purchaseOrder.create({
      data: {
        poNumber,
        supplierId,
        notes,
        expectedDelivery: expectedDelivery ? new Date(expectedDelivery) : null,
        totalAmount,
        status: 'SENT_TO_SUPPLIER',
        items: {
          create: poItemsData,
        },
      },
      include: {
        supplier: true,
        items: {
          include: { product: true },
        },
      },
    });

    return res.status(201).json({ success: true, data: po });
  } catch (error) {
    console.error('Error creating Purchase Order:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * PATCH /api/forecasting/purchase-orders/:id/receive
 * Action: Mark PO as DELIVERED_AND_RESTOCKED and automatically increase inventory stock!
 */
export const receiveAndRestockPO = async (req, res) => {
  try {
    const { id } = req.params;
    const { newPhoneUnits } = req.body;

    const po = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: {
        items: {
          include: { product: true },
        },
      },
    });

    if (!po) {
      return res.status(404).json({ success: false, message: 'Purchase Order not found' });
    }

    if (po.status === 'DELIVERED_AND_RESTOCKED') {
      return res.status(400).json({ success: false, message: 'Purchase Order has already been received & restocked!' });
    }

    for (const item of po.items) {
      const product = item.product;

      if (product.type !== 'PHONE') {
        await prisma.product.update({
          where: { id: product.id },
          data: {
            stockQuantity: {
              increment: item.quantityOrdered,
            },
          },
        });
      }
    }

    if (newPhoneUnits && Array.isArray(newPhoneUnits) && newPhoneUnits.length > 0) {
      for (const unit of newPhoneUnits) {
        if (unit.productId && unit.imei1) {
          await prisma.phoneUnit.create({
            data: {
              productId: unit.productId,
              imei1: unit.imei1,
              imei2: unit.imei2 || null,
              serialNumber: unit.serialNumber || null,
              color: unit.color || 'Black',
              storage: unit.storage || '128GB',
              buyingPrice: parseFloat(unit.buyingPrice || unit.unitCost || 0),
              retailPrice: parseFloat(unit.retailPrice || (unit.buyingPrice || 0) * 1.25),
              minSellingPrice: parseFloat(unit.retailPrice || 0) * 0.95,
              condition: 'NEW_SEALED',
              status: 'IN_STOCK',
            },
          });
        }
      }
    }

    const updatedPo = await prisma.purchaseOrder.update({
      where: { id },
      data: {
        status: 'DELIVERED_AND_RESTOCKED',
        receivedAt: new Date(),
      },
      include: {
        supplier: true,
        items: { include: { product: true } },
      },
    });

    return res.json({
      success: true,
      message: 'Purchase order delivered and inventory automatically restocked!',
      data: updatedPo,
    });
  } catch (error) {
    console.error('Error receiving PO:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};
