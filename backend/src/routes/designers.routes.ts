import { Router } from 'express';
import { designersController } from '../controllers/designers.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requirePermission } from '../middleware/permission.middleware';
import { asyncHandler } from '../utils/response';

export const designersRoutes = Router();
designersRoutes.use(authenticate);

designersRoutes.get('/', requirePermission('designers.view'), asyncHandler(designersController.list));
designersRoutes.get('/workload', requirePermission('designers.view'), asyncHandler(designersController.workload));
designersRoutes.get('/:id', requirePermission('designers.view'), asyncHandler(designersController.detail));
designersRoutes.get('/:id/performance', requirePermission('designer.performance.view'), asyncHandler(designersController.performance));
designersRoutes.get('/:id/tasks', requirePermission('designers.view'), asyncHandler(designersController.tasks));
