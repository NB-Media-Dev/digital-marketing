import { Router } from 'express';
import { usersController, notificationsController, auditController } from '../controllers/users.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requirePermission } from '../middleware/permission.middleware';
import { validateBody } from '../middleware/validation.middleware';
import { createUserSchema } from '../validators/conversion.validator';
import { asyncHandler } from '../utils/response';

// /api/users
export const usersRoutes = Router();
usersRoutes.use(authenticate);
usersRoutes.get('/', requirePermission('users.view'), asyncHandler(usersController.list));
usersRoutes.post('/', requirePermission('users.create'), validateBody(createUserSchema), asyncHandler(usersController.create));
usersRoutes.patch('/:id', requirePermission('users.edit'), asyncHandler(usersController.update));
usersRoutes.post('/:id/disable', requirePermission('users.disable'), asyncHandler(usersController.disable));
usersRoutes.post('/:id/enable', requirePermission('users.disable'), asyncHandler(usersController.enable));

// /api/notifications
export const notificationsRoutes = Router();
notificationsRoutes.use(authenticate);
notificationsRoutes.get('/', asyncHandler(notificationsController.list));
notificationsRoutes.get('/unread-count', asyncHandler(notificationsController.unreadCount));
notificationsRoutes.post('/:id/read', asyncHandler(notificationsController.markRead));
notificationsRoutes.post('/read-all', asyncHandler(notificationsController.markAllRead));

// /api/audit
export const auditRoutes = Router();
auditRoutes.use(authenticate);
auditRoutes.get('/', requirePermission('audit.view'), asyncHandler(auditController.list));
