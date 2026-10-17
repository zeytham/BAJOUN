import express from 'express';
import {
  getWarrantyCertificates,
  createWarrantyCertificate,
  verifyWarrantyByImei,
  createSupplierRmaClaim,
  getSupplierRmaClaims,
  resolveSupplierRmaClaim,
  getWarrantyAnalytics,
} from '../controllers/warranties.controller.js';
import { requireRole } from '../middleware/auth.js';

const router = express.Router();

router.get('/', requireRole('ADMIN', 'MANAGER', 'CASHIER'), getWarrantyCertificates);
router.get('/analytics', requireRole('ADMIN', 'MANAGER'), getWarrantyAnalytics);
router.get('/verify/:term', requireRole('ADMIN', 'MANAGER', 'CASHIER'), verifyWarrantyByImei);
router.post('/issue', requireRole('ADMIN', 'MANAGER', 'CASHIER'), createWarrantyCertificate);

// Supplier RMA Routes
router.get('/rma', requireRole('ADMIN', 'MANAGER', 'CASHIER'), getSupplierRmaClaims);
router.post('/rma', requireRole('ADMIN', 'MANAGER', 'CASHIER'), createSupplierRmaClaim);
router.patch('/rma/:id/resolve', requireRole('ADMIN', 'MANAGER'), resolveSupplierRmaClaim);

export default router;
