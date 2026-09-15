import { Router } from 'express';
import { leadsController } from '../controllers/leads.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requirePermission } from '../middleware/permission.middleware';
import { validateBody } from '../middleware/validation.middleware';
import { assignLeadSchema, createLeadSchema, leadStatusSchema } from '../validators/lead.validator';
import { asyncHandler } from '../utils/response';

export const leadsRoutes = Router();
leadsRoutes.use(authenticate);

leadsRoutes.get('/', requirePermission('leads.view'), asyncHandler(leadsController.list));
leadsRoutes.get('/funnel', requirePermission('leads.view'), asyncHandler(leadsController.funnel));
leadsRoutes.get('/not-interested', requirePermission('leads.view'), asyncHandler(leadsController.notInterested));
leadsRoutes.get('/source-performance', requirePermission('leads.view'), asyncHandler(leadsController.sources));
leadsRoutes.get('/:id', requirePermission('leads.view'), asyncHandler(leadsController.detail));
leadsRoutes.get('/:id/history', requirePermission('leads.view'), asyncHandler(leadsController.history));
leadsRoutes.post('/', requirePermission('leads.view'), validateBody(createLeadSchema), asyncHandler(leadsController.create));
leadsRoutes.post('/:id/assign', requirePermission('leads.assign'), validateBody(assignLeadSchema), asyncHandler(leadsController.assign));
leadsRoutes.patch('/:id', requirePermission('leads.update'), validateBody(leadStatusSchema), asyncHandler(leadsController.updateStatus));
