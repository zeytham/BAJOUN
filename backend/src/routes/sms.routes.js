import express from 'express';
import { getSmsLogs, sendSms } from '../controllers/sms.controller.js';
import { requireRole } from '../middleware/auth.js';

const router = express.Router();

router.get('/', requireRole('ADMIN', 'MANAGER'), getSmsLogs);
router.post('/send', requireRole('ADMIN', 'MANAGER'), sendSms);

export default router;
