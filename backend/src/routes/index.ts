import { Router } from 'express';
import { prisma } from '../database/prisma';
import { asyncHandler } from '../utils/response';
import { authRoutes } from './auth.routes';
import { usersRoutes, notificationsRoutes, auditRoutes } from './users.routes';
import { rolesRoutes } from './roles.routes';
import { tasksRoutes } from './tasks.routes';
import { designersRoutes } from './designers.routes';
import { campaignsRoutes } from './campaigns.routes';
import { adsRoutes } from './ads.routes';
import { leadsRoutes } from './leads.routes';
import { callsRoutes, followupsRoutes, telecallingRoutes } from './telecalling.routes';
import { conversionsRoutes, transactionsRoutes } from './conversions.routes';
import { reportsRoutes, dashboardRoutes } from './reports.routes';
import { metaRoutes } from './meta.routes';
import { searchRoutes } from './search.routes';

export const apiRouter = Router();

/** Health check — no auth. */
apiRouter.get('/health', asyncHandler(async (_req, res) => {
  let database = 'connected';
  try {
    await prisma.$queryRawUnsafe('SELECT 1');
  } catch {
    database = 'disconnected';
  }
  res.json({ success: true, status: database === 'connected' ? 'healthy' : 'degraded', database, timestamp: new Date().toISOString() });
}));

apiRouter.use('/auth', authRoutes);
apiRouter.use('/users', usersRoutes);
apiRouter.use('/roles', rolesRoutes);
apiRouter.use('/tasks', tasksRoutes);
apiRouter.use('/designers', designersRoutes);
apiRouter.use('/campaigns', campaignsRoutes);
apiRouter.use('/ads', adsRoutes);
apiRouter.use('/meta', metaRoutes);
apiRouter.use('/search', searchRoutes);
apiRouter.use('/leads', leadsRoutes);
apiRouter.use('/calls', callsRoutes);
apiRouter.use('/followups', followupsRoutes);
apiRouter.use('/telecalling', telecallingRoutes);
apiRouter.use('/conversions', conversionsRoutes);
apiRouter.use('/transactions', transactionsRoutes);
apiRouter.use('/reports', reportsRoutes);
apiRouter.use('/dashboard', dashboardRoutes);
apiRouter.use('/notifications', notificationsRoutes);
apiRouter.use('/audit', auditRoutes);
