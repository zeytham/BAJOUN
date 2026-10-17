import express from 'express';
import {
  createSale,
  verifyManagerPin,
  simulateStkPush,
  verifyTradeInVoucher,
  getReceiptPayload,
  manageShift,
} from '../controllers/pos.controller.js';
import { requireRole } from '../middleware/auth.js';

const router = express.Router();

router.post('/sales', requireRole('ADMIN', 'MANAGER', 'CASHIER'), createSale);
router.post('/manager-override', requireRole('ADMIN', 'MANAGER', 'CASHIER'), verifyManagerPin);
router.post('/stk-push', requireRole('ADMIN', 'MANAGER', 'CASHIER'), simulateStkPush);
router.get('/vouchers/:code', requireRole('ADMIN', 'MANAGER', 'CASHIER'), verifyTradeInVoucher);
router.get('/sales/:id/receipt', requireRole('ADMIN', 'MANAGER', 'CASHIER'), getReceiptPayload);
router.post('/shift', requireRole('ADMIN', 'MANAGER', 'CASHIER'), manageShift);

export default router;
