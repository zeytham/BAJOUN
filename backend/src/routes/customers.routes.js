import express from 'express';
import {
  getCustomers,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  getCustomerSales,
} from '../controllers/customers.controller.js';
import { requireRole } from '../middleware/auth.js';

const router = express.Router();

router.get('/', requireRole('ADMIN', 'MANAGER', 'CASHIER'), getCustomers);
router.post('/', requireRole('ADMIN', 'MANAGER', 'CASHIER'), createCustomer);
router.put('/:id', requireRole('ADMIN', 'MANAGER', 'CASHIER'), updateCustomer);
router.delete('/:id', requireRole('ADMIN'), deleteCustomer);
router.get('/:id/sales', requireRole('ADMIN', 'MANAGER', 'CASHIER'), getCustomerSales);

export default router;
