import express from 'express';
import {
  getSettings,
  updateSettings,
  updateSecurityCredentials,
  exportDatabaseBackup,
  getUsers,
  createUser,
  updateUser,
  deleteUser,
  getSystemMetrics,
} from '../controllers/settings.controller.js';
import { requireRole } from '../middleware/auth.js';

const router = express.Router();

// Store settings: public read for store receipt/branding, restricted update
router.get('/', getSettings);
router.put('/', requireRole('ADMIN', 'MANAGER'), updateSettings);
router.post('/security', requireRole('ADMIN'), updateSecurityCredentials);
router.get('/export-backup', requireRole('ADMIN'), exportDatabaseBackup);

// Staff Users & Role Access routes (Strictly Admin / Manager)
router.get('/users', requireRole('ADMIN', 'MANAGER'), getUsers);
router.post('/users', requireRole('ADMIN'), createUser);
router.put('/users/:id', requireRole('ADMIN'), updateUser);
router.delete('/users/:id', requireRole('ADMIN'), deleteUser);

// System Health & Metrics
router.get('/metrics', requireRole('ADMIN', 'MANAGER'), getSystemMetrics);

export default router;


