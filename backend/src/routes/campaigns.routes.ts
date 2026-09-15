import { Router } from 'express';
import { campaignsController } from '../controllers/campaigns.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requirePermission } from '../middleware/permission.middleware';
import { validateBody } from '../middleware/validation.middleware';
import { campaignSchema } from '../validators/conversion.validator';
import { asyncHandler } from '../utils/response';

export const campaignsRoutes = Router();
campaignsRoutes.use(authenticate);

campaignsRoutes.get('/', requirePermission('campaigns.view'), asyncHandler(campaignsController.list));
campaignsRoutes.get('/performance', requirePermission('campaigns.view'), asyncHandler(campaignsController.performance));
campaignsRoutes.post('/', requirePermission('campaigns.create'), validateBody(campaignSchema), asyncHandler(campaignsController.create));
campaignsRoutes.patch('/:id', requirePermission('campaigns.edit'), asyncHandler(campaignsController.update));
