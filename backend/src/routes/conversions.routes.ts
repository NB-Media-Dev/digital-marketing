import { Router } from 'express';
import { conversionsController, transactionsController } from '../controllers/conversions.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requirePermission } from '../middleware/permission.middleware';
import { validateBody } from '../middleware/validation.middleware';
import {
  createConversionSchema, createTransactionSchema, updateConversionSchema, updateTransactionSchema,
} from '../validators/conversion.validator';
import { asyncHandler } from '../utils/response';

export const conversionsRoutes = Router();
conversionsRoutes.use(authenticate);
conversionsRoutes.get('/', requirePermission('conversions.view'), asyncHandler(conversionsController.list));
conversionsRoutes.get('/dashboard', requirePermission('conversions.view'), asyncHandler(conversionsController.dashboard));
conversionsRoutes.post('/', requirePermission('conversions.update'), validateBody(createConversionSchema), asyncHandler(conversionsController.create));
conversionsRoutes.patch('/:id', requirePermission('conversions.update'), validateBody(updateConversionSchema), asyncHandler(conversionsController.update));

export const transactionsRoutes = Router();
transactionsRoutes.use(authenticate);
transactionsRoutes.get('/', requirePermission('transactions.view'), asyncHandler(transactionsController.list));
transactionsRoutes.post('/', requirePermission('transactions.update'), validateBody(createTransactionSchema), asyncHandler(transactionsController.create));
transactionsRoutes.patch('/:id', requirePermission('transactions.update'), validateBody(updateTransactionSchema), asyncHandler(transactionsController.update));
