import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Helper: Seed Default Customers if empty
export const seedDefaultCustomers = async () => {
  const count = await prisma.customer.count();
  if (count === 0) {
    await prisma.customer.createMany({
      data: [
        {
          name: 'Juma Ally Kapuya',
          phone: '+255 712 345 678',
          email: 'juma.kapuya@gmail.com',
          tinNumber: '112-990-441',
          totalSpent: 6500000,
        },
        {
          name: 'Amina Salum Mselem',
          phone: '+255 784 990 112',
          email: 'amina.salum@yahoo.com',
          tinNumber: '109-887-223',
          totalSpent: 3200000,
        },
        {
          name: 'Rashid Bakari Chande',
          phone: '+255 655 443 211',
          email: 'rashid.chande@outlook.com',
          tinNumber: '120-445-998',
          totalSpent: 850000,
        },
        {
          name: 'Halima Hassan Kimaro',
          phone: '+255 767 112 004',
          email: 'halima.kimaro@gmail.com',
          totalSpent: 350000,
        },
      ],
    });
  }
};

/**
 * GET /api/customers
 * Fetch all customers with VIP Tier, sales count, and vouchers count
 */
export const getCustomers = async (req, res) => {
  try {
    const customers = await prisma.customer.findMany({
      include: {
        _count: {
          select: { sales: true, vouchers: true },
        },
        vouchers: {
          where: { isRedeemed: false },
        },
      },
      orderBy: { totalSpent: 'desc' },
    });

    const enriched = customers.map((c) => {
      let vipTier = 'STANDARD';
      if (c.totalSpent >= 5000000) vipTier = 'PLATINUM';
      else if (c.totalSpent >= 2000000) vipTier = 'GOLD';
      else if (c.totalSpent >= 500000) vipTier = 'SILVER';

      return {
        id: c.id,
        name: c.name,
        phone: c.phone,
        email: c.email,
        tinNumber: c.tinNumber,
        totalSpent: c.totalSpent,
        vipTier,
        salesCount: c._count.sales,
        vouchersCount: c._count.vouchers,
        activeVouchers: c.vouchers,
        createdAt: c.createdAt,
      };
    });

    return res.json({ success: true, data: enriched });
  } catch (error) {
    console.error('Error fetching customers:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /api/customers
 * Register a new customer
 */
export const createCustomer = async (req, res) => {
  try {
    const { name, phone, email, tinNumber } = req.body;

    if (!name || !phone) {
      return res.status(400).json({ success: false, message: 'Tafadhali jaza Jina na Namba ya Simu ya Mteja!' });
    }

    const existing = await prisma.customer.findUnique({ where: { phone } });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Mteja mwenye namba hii ya simu tayari yupo!' });
    }

    const customer = await prisma.customer.create({
      data: {
        name,
        phone,
        email: email || null,
        tinNumber: tinNumber || null,
        totalSpent: 0,
      },
    });

    return res.status(201).json({
      success: true,
      message: 'Mteja amesajiliwa kwa mafanikio kwenye Customer CRM!',
      data: customer,
    });
  } catch (error) {
    console.error('Error creating customer:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * PUT /api/customers/:id
 * Update customer details
 */
export const updateCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phone, email, tinNumber } = req.body;

    const updated = await prisma.customer.update({
      where: { id },
      data: {
        name,
        phone,
        email: email || null,
        tinNumber: tinNumber || null,
      },
    });

    return res.json({
      success: true,
      message: 'Taarifa za mteja zimesasishwa kwa mafanikio!',
      data: updated,
    });
  } catch (error) {
    console.error('Error updating customer:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * DELETE /api/customers/:id
 * Delete customer record
 */
export const deleteCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.customer.delete({ where: { id } });
    return res.json({ success: true, message: 'Mteja amefutwa kwa mafanikio!' });
  } catch (error) {
    console.error('Error deleting customer:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/customers/:id/sales
 * Fetch sales history for a specific customer
 */
export const getCustomerSales = async (req, res) => {
  try {
    const { id } = req.params;
    const sales = await prisma.sale.findMany({
      where: { customerId: id },
      include: {
        items: {
          include: { product: true, phoneUnit: true },
        },
        payments: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.json({ success: true, data: sales });
  } catch (error) {
    console.error('Error fetching customer sales:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};
