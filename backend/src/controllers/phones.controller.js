import { PrismaClient } from '@prisma/client';
import { canSeeCost } from '../middleware/auth.js';
const prisma = new PrismaClient();

function publicUnit(unit, seeCost) {
  if (seeCost) return unit;
  const { buyingPrice, minSellingPrice, product, ...rest } = unit;
  const cleanProduct = product
    ? (({ costPrice, ...productRest }) => productRest)(product)
    : product;
  return { ...rest, product: cleanProduct };
}

// Get all phone units with filters
export const getPhoneUnits = async (req, res) => {
  try {
    const { status, condition, search } = req.query;

    const where = {};
    if (status) where.status = status;
    if (condition) where.condition = condition;

    if (search) {
      where.OR = [
        { imei1: { contains: search } },
        { imei2: { contains: search } },
        { serialNumber: { contains: search } },
        { product: { name: { contains: search } } },
      ];
    }

    const units = await prisma.phoneUnit.findMany({
      where,
      include: {
        product: {
          include: { brand: true, category: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const seeCost = canSeeCost(req);
    res.json({ success: true, count: units.length, data: units.map((unit) => publicUnit(unit, seeCost)) });
  } catch (error) {
    res.status(500).json({ error: true, message: error.message });
  }
};

// Add Single Phone Unit
export const addPhoneUnit = async (req, res) => {
  try {
    const {
      productId,
      imei1,
      imei2,
      serialNumber,
      condition,
      color,
      storage,
      ram,
      batteryHealth,
      buyingPrice,
      retailPrice,
      minSellingPrice,
      warrantyMonths,
      notes,
    } = req.body;

    // Check duplicate IMEI
    const existing = await prisma.phoneUnit.findFirst({
      where: {
        OR: [
          { imei1: imei1 },
          imei2 ? { imei2: imei2 } : undefined,
        ].filter(Boolean)
      }
    });

    if (existing) {
      return res.status(400).json({ error: true, message: `IMEI ${imei1} already exists in the system!` });
    }

    const unit = await prisma.phoneUnit.create({
      data: {
        productId,
        imei1,
        imei2: imei2 || null,
        serialNumber: serialNumber || null,
        condition: condition || 'NEW_SEALED',
        color,
        storage,
        ram: ram || null,
        batteryHealth: batteryHealth ? parseInt(batteryHealth) : null,
        buyingPrice: parseFloat(buyingPrice),
        retailPrice: parseFloat(retailPrice),
        minSellingPrice: minSellingPrice ? parseFloat(minSellingPrice) : parseFloat(retailPrice),
        warrantyMonths: warrantyMonths ? parseInt(warrantyMonths) : 12,
        notes: notes || null,
      },
      include: {
        product: { include: { brand: true } }
      }
    });

    res.status(201).json({ success: true, message: 'Phone IMEI registered successfully', data: unit });
  } catch (error) {
    res.status(500).json({ error: true, message: error.message });
  }
};

// Bulk Rapid IMEI Importer
export const bulkImportPhoneUnits = async (req, res) => {
  try {
    const { productId, color, storage, ram, condition, buyingPrice, retailPrice, minSellingPrice, warrantyMonths, imeis } = req.body;

    if (!Array.isArray(imeis) || imeis.length === 0) {
      return res.status(400).json({ error: true, message: 'At least one IMEI string is required' });
    }

    const results = {
      imported: 0,
      skipped: [],
      units: []
    };

    for (const item of imeis) {
      const imei1 = typeof item === 'string' ? item.trim() : item.imei1?.trim();
      const imei2 = typeof item === 'object' ? item.imei2?.trim() : null;

      if (!imei1) continue;

      const existing = await prisma.phoneUnit.findUnique({ where: { imei1 } });
      if (existing) {
        results.skipped.push({ imei: imei1, reason: 'Duplicate IMEI' });
        continue;
      }

      const created = await prisma.phoneUnit.create({
        data: {
          productId,
          imei1,
          imei2,
          color,
          storage,
          ram: ram || null,
          condition: condition || 'NEW_SEALED',
          buyingPrice: parseFloat(buyingPrice),
          retailPrice: parseFloat(retailPrice),
          minSellingPrice: minSellingPrice ? parseFloat(minSellingPrice) : parseFloat(retailPrice),
          warrantyMonths: warrantyMonths ? parseInt(warrantyMonths) : 12,
          status: 'IN_STOCK',
        }
      });

      results.imported++;
      results.units.push(created);
    }

    res.json({
      success: true,
      message: `Bulk import completed: ${results.imported} IMEIs added, ${results.skipped.length} skipped.`,
      data: results
    });
  } catch (error) {
    res.status(500).json({ error: true, message: error.message });
  }
};

// Update Phone Unit Status
export const updatePhoneUnitStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, condition, retailPrice } = req.body;

    const data = {};
    if (status) data.status = status;
    if (condition) data.condition = condition;
    if (retailPrice) data.retailPrice = parseFloat(retailPrice);

    const updated = await prisma.phoneUnit.update({
      where: { id },
      data,
    });

    res.json({ success: true, message: 'Phone unit updated successfully', data: updated });
  } catch (error) {
    res.status(500).json({ error: true, message: error.message });
  }
};

// Delete Phone Unit
export const deletePhoneUnit = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.phoneUnit.delete({ where: { id } });
    res.json({ success: true, message: 'Phone unit deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: true, message: error.message });
  }
};

