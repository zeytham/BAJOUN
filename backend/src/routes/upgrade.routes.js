import express from 'express';
import {
  evaluatePhoneUpgrade,
  saveDigitalContract,
  getUpgradeEvaluations,
  updateUpgradeStatus,
  getUpgradeAnalytics,
} from '../controllers/upgrade.controller.js';
import { requireRole } from '../middleware/auth.js';

const router = express.Router();

router.get('/', requireRole('ADMIN', 'MANAGER', 'CASHIER'), getUpgradeEvaluations);
router.get('/analytics', requireRole('ADMIN', 'MANAGER'), getUpgradeAnalytics);
router.post('/evaluate', requireRole('ADMIN', 'MANAGER', 'CASHIER'), evaluatePhoneUpgrade);
router.post('/contract', requireRole('ADMIN', 'MANAGER', 'CASHIER'), saveDigitalContract);
router.patch('/:id/status', requireRole('ADMIN', 'MANAGER', 'CASHIER'), updateUpgradeStatus);

export default router;

