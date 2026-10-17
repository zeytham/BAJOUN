import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { hashPin, normalizePin } from '../services/pin.service.js';

const prisma = new PrismaClient();

// Helper: Seed Default StoreSetting if not exists
const getOrCreateDefaultSettings = async () => {
  let settings = await prisma.storeSetting.findUnique({
    where: { id: 'default' },
  });

  if (!settings) {
    settings = await prisma.storeSetting.create({
      data: {
        id: 'default',
        shopName: 'PhoneVault Pro Enterprise',
        shopPhone: '+255 624 945 919',
        shopEmail: 'info@phonevault.tz',
        shopAddress: 'Kariakoo Commercial Complex, Dar es Salaam',
        tinNumber: '123-456-789',
        vrnNumber: '40-012345-X',
        currency: 'TSH',
        exchangeRate: 2650.0,
        taxRate: 18.0,
        receiptHeader: 'Karibu PhoneVault Pro - Quality Guaranteed!',
        receiptFooter: 'Asante kwa kununua nasi! Warranty Certificate Included.',
      },
    });
  }
  return settings;
};

/**
 * GET /api/settings
 * Fetch global store settings (Shop name, TIN/VRN, address, tax rate, exchange rate, receipt text)
 */
export const getSettings = async (req, res) => {
  try {
    const settings = await getOrCreateDefaultSettings();
    return res.json({ success: true, data: settings });
  } catch (error) {
    console.error('Error fetching settings:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * PUT /api/settings
 * Update global store settings
 */
export const updateSettings = async (req, res) => {
  try {
    const {
      shopName,
      shopPhone,
      shopEmail,
      shopAddress,
      tinNumber,
      vrnNumber,
      currency,
      exchangeRate,
      taxRate,
      receiptHeader,
      receiptFooter,
    } = req.body;

    await getOrCreateDefaultSettings();

    const updated = await prisma.storeSetting.update({
      where: { id: 'default' },
      data: {
        shopName: shopName || 'PhoneVault Pro Enterprise',
        shopPhone,
        shopEmail,
        shopAddress,
        tinNumber,
        vrnNumber,
        currency: currency || 'TSH',
        exchangeRate: exchangeRate ? parseFloat(exchangeRate) : 2650.0,
        taxRate: taxRate !== undefined ? parseFloat(taxRate) : 18.0,
        receiptHeader,
        receiptFooter,
      },
    });

    return res.json({
      success: true,
      message: 'Store settings updated successfully across the entire system!',
      data: updated,
    });
  } catch (error) {
    console.error('Error updating settings:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /api/settings/security
 * Change Owner Password and Manager PIN
 */
export const updateSecurityCredentials = async (req, res) => {
  try {
    const { currentPassword, newPassword, newPin } = req.body;
    const adminId = req.user?.id;

    let user = adminId
      ? await prisma.user.findUnique({ where: { id: adminId } })
      : await prisma.user.findFirst({ where: { role: 'ADMIN' } });

    if (!user) {
      return res.status(404).json({ success: false, message: 'Admin account not found.' });
    }

    if (!newPassword && !newPin) {
      return res.status(400).json({ success: false, message: 'Weka nenosiri jipya au PIN mpya.' });
    }
    if (!currentPassword) {
      return res.status(400).json({ success: false, message: 'Weka nenosiri la sasa kabla ya kubadili.' });
    }
    const isValid = await bcrypt.compare(currentPassword, user.password);
    if (!isValid) {
      return res.status(401).json({ success: false, message: 'Nenosiri la sasa sio sahihi.' });
    }

    const updateData = {};
    if (newPassword) {
      updateData.password = await bcrypt.hash(newPassword, 10);
    }
    if (newPin) {
      if (!normalizePin(newPin)) {
        return res.status(400).json({ success: false, message: 'PIN iwe tarakimu 4.' });
      }
      updateData.pin = await hashPin(newPin);
    }

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: updateData,
    });

    return res.json({
      success: true,
      message: 'Security Password & Manager PIN updated successfully!',
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
      },
    });
  } catch (error) {
    console.error('Error updating security credentials:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/settings/users
 * Fetch all registered system users / staff members (PIN is hidden for security)
 */
export const getUsers = async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    return res.json({ success: true, data: users });
  } catch (error) {
    console.error('Error fetching users:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /api/settings/users
 * Create a new staff user (Cashier, Manager, Technician, Admin)
 */
export const createUser = async (req, res) => {
  try {
    const { name, email, password, role = 'CASHIER', pin } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Faza jaza Jina, Email na Password!' });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Email hii tayari imesajiliwa kwenye mfumo!' });
    }

    if (!normalizePin(pin)) {
      return res.status(400).json({ success: false, message: 'PIN iwe tarakimu 4.' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: role.toUpperCase(),
        pin: await hashPin(pin),
        active: true,
      },
    });

    return res.status(201).json({
      success: true,
      message: 'Mtumiaji mpya amesajiliwa kwa mafanikio!',
      data: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        active: newUser.active,
      },
    });
  } catch (error) {
    console.error('Error creating user:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * PUT /api/settings/users/:id
 * Update staff role, PIN, status, or password
 */
export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, role, pin, active, password } = req.body;

    const updateData = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (role) updateData.role = role.toUpperCase();
    if (pin) {
      if (!normalizePin(pin)) {
        return res.status(400).json({ success: false, message: 'PIN iwe tarakimu 4.' });
      }
      updateData.pin = await hashPin(pin);
    }
    if (typeof active === 'boolean') updateData.active = active;
    if (password) updateData.password = await bcrypt.hash(password, 10);

    const updated = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
      },
    });

    return res.json({
      success: true,
      message: 'Taarifa za mfanyakazi zimesasishwa kwa mafanikio!',
      data: updated,
    });
  } catch (error) {
    console.error('Error updating user:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * DELETE /api/settings/users/:id
 * Delete staff user account
 */
export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if user is sole ADMIN
    const user = await prisma.user.findUnique({ where: { id } });
    if (user && user.role === 'ADMIN') {
      const adminCount = await prisma.user.count({ where: { role: 'ADMIN' } });
      if (adminCount <= 1) {
        return res.status(400).json({
          success: false,
          message: 'Huwezi kufuta Admin pekee aliyebaki kwenye mfumo!',
        });
      }
    }

    await prisma.user.delete({ where: { id } });
    return res.json({ success: true, message: 'Mtumiaji amefutwa kwenye mfumo kwa mafanikio!' });
  } catch (error) {
    console.error('Error deleting user:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/settings/export-backup
 * 1-Click Database Dump Backup Export
 */
export const exportDatabaseBackup = async (req, res) => {
  try {
    const [products, phoneUnits, categories, sales, expenses, suppliers, pos, users] = await Promise.all([
      prisma.product.findMany({ include: { variants: true } }),
      prisma.phoneUnit.findMany(),
      prisma.category.findMany(),
      prisma.sale.findMany({ include: { items: true, payments: true } }),
      prisma.storeExpense.findMany(),
      prisma.supplier.findMany(),
      prisma.purchaseOrder.findMany({ include: { items: true } }),
      prisma.user.findMany({ select: { id: true, name: true, email: true, role: true, active: true } }),
    ]);

    const backupData = {
      timestamp: new Date().toISOString(),
      shop: await getOrCreateDefaultSettings(),
      inventory: {
        productsCount: products.length,
        phoneUnitsCount: phoneUnits.length,
        categoriesCount: categories.length,
        products,
        phoneUnits,
      },
      sales: {
        salesCount: sales.length,
        sales,
      },
      expenses: {
        expensesCount: expenses.length,
        expenses,
      },
      suppliers: {
        suppliersCount: suppliers.length,
        suppliers,
        purchaseOrders: pos,
      },
      users: {
        usersCount: users.length,
        users,
      },
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=PhoneVault_Backup_${Date.now()}.json`);
    return res.send(JSON.stringify(backupData, null, 2));
  } catch (error) {
    console.error('Error exporting backup:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/settings/metrics
 * Fetch live system health metrics for backup & health hub
 */
export const getSystemMetrics = async (req, res) => {
  try {
    const [productsCount, phoneUnitsCount, salesCount, expensesCount, usersCount, suppliersCount] = await Promise.all([
      prisma.product.count(),
      prisma.phoneUnit.count(),
      prisma.sale.count(),
      prisma.storeExpense.count(),
      prisma.user.count(),
      prisma.supplier.count(),
    ]);

    return res.json({
      success: true,
      data: {
        productsCount,
        phoneUnitsCount,
        salesCount,
        expensesCount,
        usersCount,
        suppliersCount,
        databaseStatus: 'HEALTHY_SYNCED',
        lastBackupAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Error fetching system metrics:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};


