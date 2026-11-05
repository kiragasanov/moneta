import path from 'node:path';
import express from 'express';
import { config } from './config.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { accountsRouter } from './routes/accounts.js';
import { budgetsRouter } from './routes/budgets.js';
import { categoriesRouter } from './routes/categories.js';
import { statsRouter } from './routes/stats.js';
import { transactionsRouter } from './routes/transactions.js';

/**
 * Создает экземпляр Express-приложения: REST API и раздача клиентской части.
 */
export function createApp() {
  const app = express();

  app.use(express.json({ limit: '100kb' }));

  // REST API
  app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
  app.use('/api/accounts', accountsRouter);
  app.use('/api/categories', categoriesRouter);
  app.use('/api/transactions', transactionsRouter);
  app.use('/api/budgets', budgetsRouter);
  app.use('/api/stats', statsRouter);
  app.use('/api', notFoundHandler);

  // Клиентская часть (SPA) и библиотека графиков
  app.use('/vendor/chart.js', express.static(path.join(config.clientDir, '..', 'node_modules', 'chart.js', 'dist')));
  app.use(express.static(config.clientDir));
  app.get('*', (req, res) => res.sendFile(path.join(config.clientDir, 'index.html')));

  app.use(errorHandler);
  return app;
}
