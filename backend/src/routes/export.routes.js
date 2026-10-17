import express from 'express';
import { requireRole } from '../middleware/auth.js';
import { loadSales, salesToCsv, salesToXlsx } from '../services/export.service.js';

const router = express.Router();

router.get('/sales.csv', requireRole('ADMIN', 'MANAGER', 'CASHIER'), async (req, res) => {
  try {
    const sales = await loadSales(req.query);
    const csv = salesToCsv(sales);
    const stamp = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="mauzo-${stamp}.csv"`);
    res.send(csv);
  } catch (error) {
    res.status(500).json({ error: true, message: error.message });
  }
});

router.get('/sales.xlsx', requireRole('ADMIN', 'MANAGER', 'CASHIER'), async (req, res) => {
  try {
    const sales = await loadSales(req.query);
    const buffer = await salesToXlsx(sales);
    const stamp = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="mauzo-${stamp}.xlsx"`);
    res.send(Buffer.from(buffer));
  } catch (error) {
    res.status(500).json({ error: true, message: error.message });
  }
});

export default router;
