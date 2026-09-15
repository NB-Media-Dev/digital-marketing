import { Router } from 'express';
import { adsController } from '../controllers/ads.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requirePermission } from '../middleware/permission.middleware';
import { validateBody } from '../middleware/validation.middleware';
import { adSchema } from '../validators/conversion.validator';
import { asyncHandler } from '../utils/response';

export const adsRoutes = Router();
adsRoutes.use(authenticate);

adsRoutes.get('/', requirePermission('ads.view'), asyncHandler(adsController.list));
adsRoutes.get('/sync-logs', requirePermission('ads.view'), asyncHandler(adsController.syncLogs));
adsRoutes.post('/', requirePermission('ads.create'), validateBody(adSchema), asyncHandler(adsController.create));
adsRoutes.patch('/:id', requirePermission('ads.update'), asyncHandler(adsController.update));
adsRoutes.post('/sync', requirePermission('ads.sync'), asyncHandler(adsController.sync));
