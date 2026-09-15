import { Router } from 'express';
import { reportsController, dashboardController } from '../controllers/reports.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requirePermission } from '../middleware/permission.middleware';
import { asyncHandler } from '../utils/response';

// /api/reports
export const reportsRoutes = Router();
reportsRoutes.use(authenticate);
reportsRoutes.get('/', requirePermission('reports.view'), asyncHandler(reportsController.data));
reportsRoutes.get('/export/csv', requirePermission('reports.export'), asyncHandler(reportsController.exportCsv));
reportsRoutes.get('/business', requirePermission('reports.view'), asyncHandler(reportsController.business));
reportsRoutes.get('/:type', requirePermission('reports.view'), asyncHandler(reportsController.named));

// /api/dashboard
export const dashboardRoutes = Router();
dashboardRoutes.use(authenticate);
dashboardRoutes.get('/admin', requirePermission('dashboard.view'), asyncHandler(dashboardController.admin));
dashboardRoutes.get('/business-funnel', requirePermission('dashboard.view'), asyncHandler(dashboardController.businessFunnel));
dashboardRoutes.get('/needs-attention', requirePermission('dashboard.view'), asyncHandler(dashboardController.needsAttention));
dashboardRoutes.get('/activity', requirePermission('dashboard.view'), asyncHandler(dashboardController.activity));
dashboardRoutes.get('/pending', requirePermission('dashboard.view'), asyncHandler(dashboardController.pending));
dashboardRoutes.get('/business-health', requirePermission('dashboard.view'), asyncHandler(dashboardController.businessHealth));
dashboardRoutes.get('/today', requirePermission('dashboard.view'), asyncHandler(dashboardController.today));
