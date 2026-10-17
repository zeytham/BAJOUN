import express from 'express';
import {
  getSalesVelocity,
  getAbcMatrix,
  getSuppliers,
  createSupplier,
  getPurchaseOrders,
  createPurchaseOrder,
  receiveAndRestockPO,
} from '../controllers/forecasting.controller.js';
import { requireRole } from '../middleware/auth.js';

const router = express.Router();

// Units sold per day, and days of stock left.
router.get('/velocity', requireRole('ADMIN', 'MANAGER'), getSalesVelocity);

// Fast-Moving vs Dead-Stock ABC Matrix
router.get('/abc-matrix', requireRole('ADMIN', 'MANAGER'), getAbcMatrix);

// Supplier Management
router.get('/suppliers', requireRole('ADMIN', 'MANAGER'), getSuppliers);
router.post('/suppliers', requireRole('ADMIN', 'MANAGER'), createSupplier);

// Purchase Orders (PO Tracker)
router.get('/purchase-orders', requireRole('ADMIN', 'MANAGER'), getPurchaseOrders);
router.post('/purchase-orders', requireRole('ADMIN', 'MANAGER'), createPurchaseOrder);
router.patch('/purchase-orders/:id/receive', requireRole('ADMIN', 'MANAGER'), receiveAndRestockPO);

export default router;
