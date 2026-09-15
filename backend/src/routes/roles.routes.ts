import { Router } from 'express';
import { prisma } from '../database/prisma';
import { authenticate } from '../middleware/auth.middleware';
import { requirePermission } from '../middleware/permission.middleware';
import { asyncHandler, sendSuccess } from '../utils/response';

export const rolesRoutes = Router();
rolesRoutes.use(authenticate);

rolesRoutes.get('/', requirePermission('users.view'), asyncHandler(async (_req, res) => {
  const roles = await prisma.role.findMany({ orderBy: { name: 'asc' } });
  sendSuccess(res, roles);
}));
