import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import { PrismaClient } from '@prisma/client';
import backupRoutes from './routes/backup.routes.js';
import syncRoutes from './routes/sync.routes.js';
import exportRoutes from './routes/export.routes.js';
import { startShopJobs } from './jobs/shop.job.js';
import { upgradePlainPins } from './services/pin.service.js';
import { syncStatus } from './services/cloudSync.service.js';

import productsRoutes from './routes/products.routes.js';
import phonesRoutes from './routes/phones.routes.js';
import categoriesRoutes from './routes/categories.routes.js';
import compatibilityRoutes from './routes/compatibility.routes.js';
import barcodesRoutes from './routes/barcodes.routes.js';
import authRoutes from './routes/auth.routes.js';
import posRoutes from './routes/pos.routes.js';
import upgradeRoutes from './routes/upgrade.routes.js';
import warrantiesRoutes from './routes/warranties.routes.js';
import financialsRoutes from './routes/financials.routes.js';
import forecastingRoutes from './routes/forecasting.routes.js';
import settingsRoutes from './routes/settings.routes.js';
import smsRoutes from './routes/sms.routes.js';

import customersRoutes from './routes/customers.routes.js';

dotenv.config();

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 5000;

const allowedOrigin = process.env.CORS_ORIGIN;
app.use(cors(allowedOrigin ? { origin: allowedOrigin.split(',').map((item) => item.trim()), credentials: true } : undefined));
app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: false }));
app.use(express.json({ limit: '20mb' }));

app.get('/api/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    const continuity = await syncStatus();
    res.json({
      status: 'ok',
      system: 'PhoneVault POS',
      version: '1.1.0',
      database: 'sqlite',
      continuity,
    });
  } catch (error) {
    res.status(500).json({ status: 'down', database: 'sqlite', message: error.message });
  }
});

// API Routes for Module 1, Module 2, Module 3, Module 4, Module 5, Module 6, Module 7, Module 8 & SMS
app.use('/api/auth', authRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/phones', phonesRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/api/compatibility', compatibilityRoutes);
app.use('/api/barcodes', barcodesRoutes);
app.use('/api/pos', posRoutes);
app.use('/api/upgrades', upgradeRoutes);
app.use('/api/warranties', warrantiesRoutes);
app.use('/api/financials', financialsRoutes);
app.use('/api/forecasting', forecastingRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/sms', smsRoutes);
app.use('/api/customers', customersRoutes);
app.use('/api/backups', backupRoutes);
app.use('/api/sync', syncRoutes);
app.use('/api/exports', exportRoutes);


// Error Handling Middleware
app.use((err, req, res, next) => {
  console.error('API Error:', err.stack);
  res.status(500).json({ error: true, message: err.message || 'Internal Server Error' });
});

app.listen(PORT, () => {
  startShopJobs();
  upgradePlainPins().catch((error) => console.error('PIN hash upgrade failed:', error.message));
  console.log(`PhoneVault POS API running on port ${PORT} (SQLite shop database)`);
});
