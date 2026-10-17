import express from 'express';
import { requireRole } from '../middleware/auth.js';
import { drillLatest, listBackups, runBackup } from '../services/backup.service.js';

const router = express.Router();

router.get('/', requireRole('ADMIN', 'MANAGER'), async (req, res) => {
  try {
    const data = await listBackups();
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ error: true, message: error.message });
  }
});

router.post('/run', requireRole('ADMIN', 'MANAGER'), async (req, res) => {
  try {
    const result = await runBackup({ reason: 'manual' });
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ error: true, message: error.message });
  }
});

router.post('/drill', requireRole('ADMIN', 'MANAGER'), async (req, res) => {
  try {
    const result = await drillLatest();
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ error: true, message: error.message });
  }
});

export default router;
