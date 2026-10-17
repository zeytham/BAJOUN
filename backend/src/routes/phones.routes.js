import express from 'express';
import { 
  getPhoneUnits, 
  addPhoneUnit, 
  bulkImportPhoneUnits,
  updatePhoneUnitStatus,
  deletePhoneUnit,
} from '../controllers/phones.controller.js';
import { requireRole } from '../middleware/auth.js';

const router = express.Router();

router.get('/units', requireRole(), getPhoneUnits);
router.post('/units', requireRole('ADMIN', 'MANAGER'), addPhoneUnit);
router.post('/units/bulk-import', requireRole('ADMIN', 'MANAGER'), bulkImportPhoneUnits);
router.patch('/units/:id', requireRole('ADMIN', 'MANAGER', 'CASHIER'), updatePhoneUnitStatus);
router.delete('/units/:id', requireRole('ADMIN'), deletePhoneUnit);

export default router;

