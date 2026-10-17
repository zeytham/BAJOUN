import express from 'express';
import { getProducts, createProduct, getLowStockAlerts, deleteProduct } from '../controllers/products.controller.js';
import { requireRole } from '../middleware/auth.js';

const router = express.Router();

router.get('/', requireRole(), getProducts);
router.post('/', requireRole('ADMIN', 'MANAGER'), createProduct);
router.delete('/:id', requireRole('ADMIN'), deleteProduct);
router.get('/alerts/low-stock', requireRole(), getLowStockAlerts);

export default router;

