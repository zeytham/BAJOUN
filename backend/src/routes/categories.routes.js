import express from 'express';
import {
  getCategories,
  getBrands,
  getPhoneModels,
  createCategory,
  createBrand,
  createPhoneModel,
} from '../controllers/categories.controller.js';
import { requireRole } from '../middleware/auth.js';

const router = express.Router();

router.get('/', getCategories);
router.post('/', requireRole('ADMIN', 'MANAGER'), createCategory);

router.get('/brands', getBrands);
router.post('/brands', requireRole('ADMIN', 'MANAGER'), createBrand);

router.get('/models', getPhoneModels);
router.post('/models', requireRole('ADMIN', 'MANAGER'), createPhoneModel);

export default router;

