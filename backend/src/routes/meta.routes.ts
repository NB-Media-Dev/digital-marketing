import { Router } from 'express';
import { metaController } from '../controllers/meta.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requirePermission } from '../middleware/permission.middleware';
import { asyncHandler } from '../utils/response';

export const metaRoutes = Router();

// Public webhook (Meta calls these — no auth).
metaRoutes.get('/webhook', metaController.verifyWebhook);
metaRoutes.post('/webhook', asyncHandler(metaController.receiveWebhook));

// Public OAuth redirect target (Meta redirects the browser here).
metaRoutes.get('/callback', asyncHandler(metaController.callback));

// Authenticated management (Settings → Integrations → Meta Ads).
metaRoutes.get('/status', authenticate, requirePermission('ads.view'), asyncHandler(metaController.status));
metaRoutes.get('/sync-logs', authenticate, requirePermission('ads.view'), asyncHandler(metaController.syncLogs));
metaRoutes.get('/auth-url', authenticate, requirePermission('ads.sync'), asyncHandler(metaController.authUrl));
metaRoutes.post('/connect-demo', authenticate, requirePermission('ads.sync'), asyncHandler(metaController.connectDemo));
metaRoutes.post('/test', authenticate, requirePermission('ads.sync'), asyncHandler(metaController.test));
metaRoutes.post('/sync', authenticate, requirePermission('ads.sync'), asyncHandler(metaController.sync));
metaRoutes.post('/disconnect', authenticate, requirePermission('ads.sync'), asyncHandler(metaController.disconnect));
