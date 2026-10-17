import express from 'express';
import prisma from '../prisma.js';
import { ingestRemoteSale, pushUnsyncedSales, syncStatus } from '../services/cloudSync.service.js';
import { readVault, writeVault } from '../services/vaultReplica.service.js';
import { requireRole } from '../middleware/auth.js';

const router = express.Router();

function syncTokenOk(req) {
  const expected = process.env.SYNC_TOKEN || '';
  if (!expected) return false;
  return req.get('x-sync-token') === expected;
}

router.get('/status', async (req, res) => {
  try {
    const data = await syncStatus();
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ error: true, message: error.message });
  }
});

router.post('/push', requireRole('ADMIN', 'MANAGER'), async (req, res) => {
  try {
    const data = await pushUnsyncedSales();
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ error: true, message: error.message });
  }
});

router.get('/vault', (req, res) => {
  if (!syncTokenOk(req)) return res.status(401).json({ error: true, message: 'Sync token is not valid' });
  res.json({ success: true, data: readVault() });
});

router.put('/vault', (req, res) => {
  if (!syncTokenOk(req)) return res.status(401).json({ error: true, message: 'Sync token is not valid' });
  const snapshot = req.body?.snapshot;
  if (!snapshot || typeof snapshot !== 'object') {
    return res.status(400).json({ error: true, message: 'Shop snapshot is missing' });
  }
  res.json({ success: true, data: writeVault(snapshot) });
});

router.post('/ingest', async (req, res) => {
  try {
    if (!syncTokenOk(req)) {
      return res.status(401).json({ error: true, message: 'Sync token is not valid' });
    }
    const sale = req.body?.sale;
    if (!sale?.invoiceNumber || !Array.isArray(sale.items)) {
      return res.status(400).json({ error: true, message: 'Sale payload is incomplete' });
    }
    const data = await ingestRemoteSale(sale);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ error: true, message: error.message });
  }
});

router.post('/devices/seen', async (req, res) => {
  try {
    if (!syncTokenOk(req)) return res.status(401).json({ error: true, message: 'Sync token is not valid' });
    const id = req.get('x-device-id') || req.body?.deviceId;
    if (!id) return res.status(400).json({ error: true, message: 'Device id is required' });
    const device = await prisma.syncDevice.upsert({
      where: { id },
      update: { lastSeenAt: new Date(), label: req.body?.label || undefined },
      create: { id, label: req.body?.label || 'Shop till' },
    });
    res.json({ success: true, data: device });
  } catch (error) {
    res.status(500).json({ error: true, message: error.message });
  }
});

export default router;
