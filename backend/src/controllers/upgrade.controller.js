import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// Submit Phone Upgrade Diagnostic Evaluation
export const evaluatePhoneUpgrade = async (req, res) => {
  try {
    const {
      customerName,
      customerPhone,
      nidaNumber,
      oldBrandName,
      oldModelName,
      oldImei1,
      oldImei2,
      oldColor,
      oldStorage,
      batteryHealth = 90,
      hasCrackedScreen = false,
      isFaceIdWorking = true,
      isIcloudSignedOut = true,
      targetPhoneUnitId,
    } = req.body;

    if (!customerName || !customerPhone || !nidaNumber || !oldImei1) {
      return res.status(400).json({ error: true, message: 'Customer Name, Phone, NIDA Number, and IMEI 1 are mandatory' });
    }

    // 1. Strict Eligibility Gate Checks
    let status = 'APPROVED_ELIGIBLE';
    let rejectionReason = null;

    if (hasCrackedScreen) {
      status = 'REJECTED_CONDITION';
      rejectionReason = 'Device Rejected: Screen is cracked or damaged. Shop strictly sells Brand New Sealed phones.';
    } else if (!isIcloudSignedOut) {
      status = 'REJECTED_CONDITION';
      rejectionReason = 'Device Rejected: iCloud / Google Account must be 100% signed out prior to trade-in.';
    } else if (!isFaceIdWorking) {
      status = 'REJECTED_CONDITION';
      rejectionReason = 'Device Rejected: FaceID / TouchID biometrics must be fully functional.';
    } else if (parseInt(batteryHealth) < 80) {
      status = 'REJECTED_CONDITION';
      rejectionReason = `Device Rejected: Battery health (${batteryHealth}%) is below 80% minimum threshold.`;
    }

    // 2. Calculate Market Allowance if Approved
    let basePrice = 900000; // Base model market index
    const modelUpper = (oldModelName || '').toUpperCase();
    if (modelUpper.includes('11')) basePrice = 750000;
    if (modelUpper.includes('12')) basePrice = 950000;
    if (modelUpper.includes('13')) basePrice = 1300000;
    if (modelUpper.includes('14')) basePrice = 1700000;
    if (modelUpper.includes('15')) basePrice = 2200000;
    if (modelUpper.includes('S22')) basePrice = 1100000;
    if (modelUpper.includes('S23')) basePrice = 1600000;
    if (modelUpper.includes('S24')) basePrice = 2300000;

    // Storage bonus
    const storageUpper = (oldStorage || '').toUpperCase();
    if (storageUpper.includes('256GB')) basePrice += 150000;
    if (storageUpper.includes('512GB')) basePrice += 300000;
    if (storageUpper.includes('1TB')) basePrice += 500000;

    // Battery tier multiplier
    let batteryMultiplier = 1.0;
    const bHealth = parseInt(batteryHealth);
    if (bHealth >= 90) batteryMultiplier = 1.05; // 5% bonus for pristine battery
    if (bHealth >= 80 && bHealth <= 84) batteryMultiplier = 0.95; // 5% penalty for degraded battery

    const calculatedAllowance = status === 'APPROVED_ELIGIBLE' ? Math.round(basePrice * batteryMultiplier) : 0;
    const upgradeNumber = `UPGRADE-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const voucherCode = `UPGRADE-${Math.floor(100000 + Math.random() * 900000)}`;

    // Calculate target phone upgrade gap if target unit selected
    let targetPhone = null;
    let upgradeGap = 0;
    if (targetPhoneUnitId) {
      targetPhone = await prisma.phoneUnit.findUnique({
        where: { id: targetPhoneUnitId },
        include: { product: true }
      });
      if (targetPhone) {
        upgradeGap = Math.max(0, targetPhone.retailPrice - calculatedAllowance);
      }
    }

    // 3. Create Record in Database
    const record = await prisma.tradeInUpgrade.create({
      data: {
        upgradeNumber,
        customerName,
        customerPhone,
        nidaNumber,
        oldBrandName: oldBrandName || 'Apple',
        oldModelName: oldModelName || 'iPhone 13',
        oldImei1,
        oldImei2: oldImei2 || null,
        oldColor: oldColor || 'Black',
        oldStorage: oldStorage || '128GB',
        batteryHealth: bHealth,
        hasCrackedScreen: Boolean(hasCrackedScreen),
        isFaceIdWorking: Boolean(isFaceIdWorking),
        isIcloudSignedOut: Boolean(isIcloudSignedOut),
        tradeUpAllowance: calculatedAllowance,
        status,
        rejectionReason,
        voucherCode,
      }
    });

    res.status(201).json({
      success: true,
      message: status === 'APPROVED_ELIGIBLE' ? 'Upgrade Evaluation Approved!' : 'Device Rejected: Ineligible for trade-up',
      data: {
        ...record,
        targetPhone,
        upgradeGap,
      }
    });
  } catch (error) {
    res.status(500).json({ error: true, message: error.message });
  }
};

// Save Digital Signature & NIDA Contract Payload
export const saveDigitalContract = async (req, res) => {
  try {
    const { id, signatureUrl } = req.body;
    const record = await prisma.tradeInUpgrade.findUnique({ where: { id } });
    if (!record) return res.status(404).json({ error: true, message: 'Trade-in record not found' });
    if (!signatureUrl) return res.status(400).json({ error: true, message: 'Sahihi inahitajika kabla ya vocha.' });

    const updated = await prisma.tradeInUpgrade.update({
      where: { id },
      data: {
        signatureUrl,
        status: record.status === 'APPROVED_ELIGIBLE' ? 'APPROVED_RECEIVED' : record.status,
      },
    });

    if (updated.status === 'APPROVED_RECEIVED') {
      const existing = await prisma.tradeInVoucher.findUnique({ where: { code: updated.voucherCode } });
      if (!existing) {
        let cust = await prisma.customer.findUnique({ where: { phone: updated.customerPhone } });
        if (!cust) {
          cust = await prisma.customer.create({
            data: {
              name: updated.customerName,
              phone: updated.customerPhone,
              tinNumber: updated.nidaNumber || null,
            },
          });
        }
        await prisma.tradeInVoucher.create({
          data: {
            code: updated.voucherCode,
            customerId: cust.id,
            valueAmount: updated.tradeUpAllowance,
            isRedeemed: false,
          },
        });
      }
    }

    res.json({ success: true, message: 'Digital Signature & Contract saved', data: updated });
  } catch (error) {
    res.status(500).json({ error: true, message: error.message });
  }
};

// Get All Upgrades & B2B Wholesale Clearance Queue
export const getUpgradeEvaluations = async (req, res) => {
  try {
    const records = await prisma.tradeInUpgrade.findMany({
      orderBy: { createdAt: 'desc' }
    });

    res.json({ success: true, count: records.length, data: records });
  } catch (error) {
    res.status(500).json({ error: true, message: error.message });
  }
};

// Update Status (e.g. Mark Dispatched to B2B or Restock as Refurbished)
export const updateUpgradeStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, clearedToWholesale, createRefurbishedStock, productId, sellingPrice } = req.body;

    const record = await prisma.tradeInUpgrade.findUnique({ where: { id } });
    if (!record) {
      return res.status(404).json({ error: true, message: 'Trade-in record not found' });
    }

    const updated = await prisma.tradeInUpgrade.update({
      where: { id },
      data: {
        status: status || record.status,
        clearedToWholesale: clearedToWholesale !== undefined ? clearedToWholesale : record.clearedToWholesale,
      }
    });

    // Optionally create refurbished PhoneUnit in Module 1 Inventory
    if (createRefurbishedStock && productId) {
      await prisma.phoneUnit.create({
        data: {
          productId,
          imei1: record.oldImei1,
          imei2: record.oldImei2 || null,
          condition: 'REFURBISHED',
          color: record.oldColor,
          storage: record.oldStorage,
          batteryHealth: record.batteryHealth,
          buyingPrice: record.tradeUpAllowance,
          retailPrice: parseFloat(sellingPrice || record.tradeUpAllowance * 1.2),
          minSellingPrice: parseFloat(sellingPrice || record.tradeUpAllowance * 1.1),
          status: 'IN_STOCK',
          warrantyMonths: 3,
          notes: `Traded in from customer ${record.customerName} (NIDA: ${record.nidaNumber}) via Upgrade #${record.upgradeNumber}`,
        }
      });
    }

    res.json({ success: true, message: 'Upgrade record updated successfully', data: updated });
  } catch (error) {
    res.status(500).json({ error: true, message: error.message });
  }
};

// Executive Analytics Endpoint for Module 3
export const getUpgradeAnalytics = async (req, res) => {
  try {
    const records = await prisma.tradeInUpgrade.findMany();
    const approved = records.filter(r => r.status === 'APPROVED_ELIGIBLE' || r.status === 'COMPLETED_SWAP');
    const rejected = records.filter(r => r.status === 'REJECTED_CONDITION');

    const totalAllowanceGranted = approved.reduce((sum, r) => sum + (r.tradeUpAllowance || 0), 0);
    const avgAllowance = approved.length > 0 ? Math.round(totalAllowanceGranted / approved.length) : 0;
    const conversionRate = records.length > 0 ? Math.round((approved.length / records.length) * 100) : 0;

    // Traded Brands Breakdown
    const brandCounts = {};
    records.forEach(r => {
      brandCounts[r.oldBrandName] = (brandCounts[r.oldBrandName] || 0) + 1;
    });

    res.json({
      success: true,
      data: {
        totalEvaluations: records.length,
        approvedCount: approved.length,
        rejectedCount: rejected.length,
        totalAllowanceGranted,
        avgAllowance,
        conversionRate,
        brandCounts,
      }
    });
  } catch (error) {
    res.status(500).json({ error: true, message: error.message });
  }
};

