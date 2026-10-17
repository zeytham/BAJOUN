import express from 'express';
import {
  getFinancialOverview,
  getStoreExpenses,
  createStoreExpense,
  deleteStoreExpense,
  getFinancialAuditReport,
} from '../controllers/financials.controller.js';
import { requireRole } from '../middleware/auth.js';

const router = express.Router();

// Only ADMIN and MANAGER can view financials and audit reports
router.get('/overview', requireRole('ADMIN', 'MANAGER'), getFinancialOverview);
router.get('/expenses', requireRole('ADMIN', 'MANAGER'), getStoreExpenses);
router.post('/expenses', requireRole('ADMIN', 'MANAGER'), createStoreExpense);
router.delete('/expenses/:id', requireRole('ADMIN'), deleteStoreExpense);
router.get('/audit-report', requireRole('ADMIN', 'MANAGER'), getFinancialAuditReport);

export default router;

