import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

function reportRange(query) {
  const now = new Date();
  const end = query.endDate ? new Date(query.endDate) : now;
  const start = query.startDate ? new Date(query.startDate) : new Date(end.getFullYear(), end.getMonth(), 1);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) return null;
  if (query.endDate && String(query.endDate).length <= 10) end.setHours(23, 59, 59, 999);
  const limit = Math.min(100, Math.max(1, Number.parseInt(query.limit, 10) || 20));
  const offset = Math.max(0, Number.parseInt(query.offset, 10) || 0);
  return { start, end, limit, offset };
}

// Get Financial Overview (COGS, Revenue, Gross Profit, Expenses, Net Profit)
export const getFinancialOverview = async (req, res) => {
  try {
    const range = reportRange(req.query);
    if (!range) {
      return res.status(400).json({ error: true, message: 'Tarehe ya ripoti si sahihi.' });
    }
    const where = {
      status: { in: ['COMPLETED', 'PARTIAL'] },
      createdAt: { gte: range.start, lte: range.end },
    };
    const sales = await prisma.sale.findMany({
      where,
      select: {
        grandTotal: true,
        items: {
          select: {
            lineTotal: true,
            quantity: true,
            phoneUnit: { select: { buyingPrice: true } },
            product: { select: { costPrice: true, basePrice: true } },
            variant: { select: { costPrice: true } },
          },
        },
      },
    });

    const expenses = await prisma.storeExpense.findMany({
      where: { expenseDate: { gte: range.start, lte: range.end } },
    });

    // 1. Calculate Total Gross Sales Revenue
    let totalRevenue = 0;
    let totalCogs = 0;

    let phoneRevenue = 0;
    let phoneCogs = 0;

    let accessoryRevenue = 0;
    let accessoryCogs = 0;

    sales.forEach(sale => {
      totalRevenue += sale.grandTotal || 0;

      sale.items.forEach(item => {
        if (item.phoneUnit) {
          const rev = item.lineTotal || 0;
          const cost = item.phoneUnit.buyingPrice || 0;
          phoneRevenue += rev;
          phoneCogs += cost;
          totalCogs += cost;
        } else {
          const rev = item.lineTotal || 0;
          let cost = 0;
          if (item.variant) {
            cost = (item.variant.costPrice || 0) * item.quantity;
          } else if (item.product) {
            cost = (item.product.costPrice || item.product.basePrice * 0.7 || 0) * item.quantity;
          }
          accessoryRevenue += rev;
          accessoryCogs += cost;
          totalCogs += cost;
        }
      });
    });

    // 2. Gross Profit
    const grossProfit = Math.max(0, totalRevenue - totalCogs);

    // 3. Operating Expenses
    const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);

    // 4. Net Operating Profit
    const netProfit = grossProfit - totalExpenses;

    // Category Margins
    const phoneMargin = phoneRevenue > 0 ? Math.round(((phoneRevenue - phoneCogs) / phoneRevenue) * 100) : 0;
    const accessoryMargin = accessoryRevenue > 0 ? Math.round(((accessoryRevenue - accessoryCogs) / accessoryRevenue) * 100) : 0;
    const overallMargin = totalRevenue > 0 ? Math.round((grossProfit / totalRevenue) * 100) : 0;
    const [pageSales, saleCount, openDebts, debtCount, debtSum] = await Promise.all([
      prisma.sale.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: range.offset,
        take: range.limit,
        select: {
          id: true,
          invoiceNumber: true,
          grandTotal: true,
          amountPaid: true,
          status: true,
          createdAt: true,
          customer: { select: { name: true, phone: true } },
        },
      }),
      prisma.sale.count({ where }),
      prisma.debt.findMany({
        where: { status: 'OPEN' },
        orderBy: { openedAt: 'desc' },
        skip: range.offset,
        take: range.limit,
        include: { payments: { orderBy: { paidAt: 'desc' }, take: 5 } },
      }),
      prisma.debt.count({ where: { status: 'OPEN' } }),
      prisma.debt.aggregate({ where: { status: 'OPEN' }, _sum: { balance: true } }),
    ]);

    res.json({
      success: true,
      data: {
        totalRevenue,
        totalCogs,
        grossProfit,
        totalExpenses,
        netProfit,
        overallMargin,
        range: { startDate: range.start, endDate: range.end, limit: range.limit, offset: range.offset, total: saleCount },
        sales: pageSales,
        openDebtTotal: debtSum._sum.balance || 0,
        openDebtCount: debtCount,
        debts: openDebts,
        categoryBreakdown: {
          phones: { revenue: phoneRevenue, cogs: phoneCogs, profit: phoneRevenue - phoneCogs, margin: phoneMargin },
          accessories: { revenue: accessoryRevenue, cogs: accessoryCogs, profit: accessoryRevenue - accessoryCogs, margin: accessoryMargin },
        }
      }
    });
  } catch (error) {
    res.status(500).json({ error: true, message: error.message });
  }
};

// Get All Logged Store Expenses
export const getStoreExpenses = async (req, res) => {
  try {
    const expenses = await prisma.storeExpense.findMany({
      orderBy: { expenseDate: 'desc' }
    });

    res.json({ success: true, count: expenses.length, data: expenses });
  } catch (error) {
    res.status(500).json({ error: true, message: error.message });
  }
};

// Log New Store Expense (Rent, LUKU, Internet, n.k.)
export const createStoreExpense = async (req, res) => {
  try {
    const { title, category, amount, paymentMode = 'CASH', notes, expenseDate } = req.body;

    if (!title || !amount || !category) {
      return res.status(400).json({ error: true, message: 'Expense title, category, and amount are required' });
    }

    const expense = await prisma.storeExpense.create({
      data: {
        title,
        category,
        amount: parseFloat(amount),
        paymentMode,
        notes: notes || null,
        expenseDate: expenseDate ? new Date(expenseDate) : new Date(),
      }
    });

    res.status(201).json({ success: true, message: 'Store Operating Expense logged!', data: expense });
  } catch (error) {
    res.status(500).json({ error: true, message: error.message });
  }
};

// Delete Store Expense
export const deleteStoreExpense = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.storeExpense.delete({ where: { id } });
    res.json({ success: true, message: 'Expense deleted' });
  } catch (error) {
    res.status(500).json({ error: true, message: error.message });
  }
};

// Get Financial Audit Report & Payment Settlement Summary
export const getFinancialAuditReport = async (req, res) => {
  try {
    const sales = await prisma.sale.findMany({
      where: { status: 'COMPLETED' },
      include: { payments: true, items: true }
    });

    let totalCash = 0;
    let totalMpesa = 0;
    let totalCard = 0;
    let totalVouchers = 0;

    sales.forEach(s => {
      s.payments.forEach(p => {
        if (p.method === 'CASH') totalCash += p.amount;
        if (p.method === 'MPESA') totalMpesa += p.amount;
        if (p.method === 'CARD') totalCard += p.amount;
        if (p.method === 'TRADEIN_VOUCHER') totalVouchers += p.amount;
      });
    });

    const totalCollected = totalCash + totalMpesa + totalCard + totalVouchers;

    res.json({
      success: true,
      data: {
        totalSalesCount: sales.length,
        totalCollected,
        settlementBreakdown: {
          cash: totalCash,
          mpesa: totalMpesa,
          card: totalCard,
          vouchers: totalVouchers,
        }
      }
    });
  } catch (error) {
    res.status(500).json({ error: true, message: error.message });
  }
};
