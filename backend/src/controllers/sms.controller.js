import { PrismaClient } from '@prisma/client';
import { sendShopSms } from '../services/sms.service.js';

const prisma = new PrismaClient();

/**
 * GET /api/sms
 * Fetch SMS Notification Dispatch Logs
 */
export const getSmsLogs = async (req, res) => {
  try {
    const logs = await prisma.smsLog.findMany({
      orderBy: { sentAt: 'desc' },
      take: 50,
    });
    return res.json({ success: true, data: logs });
  } catch (error) {
    console.error('Error fetching SMS logs:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /api/sms/send
 * Dispatch one SMS through Beem or NextSMS when those keys exist.
 */
export const sendSms = async (req, res) => {
  try {
    const { recipient, message, type = 'CUSTOM' } = req.body;
    if (!message) {
      return res.status(400).json({ success: false, message: 'Message text is required' });
    }

    if (!recipient) {
      return res.status(400).json({ success: false, message: 'Weka namba ya mpokeaji.' });
    }
    const sent = await sendShopSms({ recipient, message, type });
    const waiting = sent.status === 'WAITING_API';
    return res.status(sent.status === 'FAILED' ? 502 : 201).json({
      success: sent.status !== 'FAILED',
      message: waiting
        ? 'SMS imehifadhiwa. Gateway ya Beem au NextSMS itaunganishwa utakapoleta API.'
        : sent.status === 'SENT'
          ? 'SMS imetumwa.'
          : 'SMS haijatumwa.',
      data: sent.data || null,
    });
  } catch (error) {
    console.error('Error sending SMS:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};
