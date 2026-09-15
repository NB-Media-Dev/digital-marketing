import { Router } from 'express';
import { telecallingController } from '../controllers/telecalling.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requirePermission } from '../middleware/permission.middleware';
import { validateBody } from '../middleware/validation.middleware';
import { createFollowupSchema, logCallSchema } from '../validators/lead.validator';
import { asyncHandler } from '../utils/response';

// /api/calls
export const callsRoutes = Router();
callsRoutes.use(authenticate);
callsRoutes.get('/', requirePermission('telecalling.view'), asyncHandler(telecallingController.listCalls));
callsRoutes.post('/', requirePermission('telecalling.update'), validateBody(logCallSchema), asyncHandler(telecallingController.logCall));

// /api/followups
export const followupsRoutes = Router();
followupsRoutes.use(authenticate);
followupsRoutes.get('/', requirePermission('telecalling.view'), asyncHandler(telecallingController.listFollowups));
followupsRoutes.post('/', requirePermission('telecalling.update'), validateBody(createFollowupSchema), asyncHandler(telecallingController.createFollowup));
followupsRoutes.post('/:id/complete', requirePermission('telecalling.update'), asyncHandler(telecallingController.completeFollowup));

// /api/telecalling
export const telecallingRoutes = Router();
telecallingRoutes.use(authenticate);
telecallingRoutes.get('/dashboard', requirePermission('telecalling.view'), asyncHandler(telecallingController.dashboard));
telecallingRoutes.get('/board', requirePermission('leads.view'), asyncHandler(telecallingController.board));
