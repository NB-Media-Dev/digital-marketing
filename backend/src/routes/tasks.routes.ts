import { Router } from 'express';
import { tasksController } from '../controllers/tasks.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requirePermission } from '../middleware/permission.middleware';
import { validateBody } from '../middleware/validation.middleware';
import { upload } from '../middleware/upload.middleware';
import { asyncHandler } from '../utils/response';
import {
  assignTaskSchema, commentSchema, createTaskSchema, progressSchema,
  revisionSchema, submitSchema, updateTaskSchema,
} from '../validators/task.validator';

export const tasksRoutes = Router();
tasksRoutes.use(authenticate);

tasksRoutes.get('/', requirePermission('tasks.view'), asyncHandler(tasksController.list));
tasksRoutes.post('/', requirePermission('tasks.create'), validateBody(createTaskSchema), asyncHandler(tasksController.create));
tasksRoutes.get('/:id', requirePermission('tasks.view'), asyncHandler(tasksController.detail));
tasksRoutes.patch('/:id', requirePermission('tasks.update'), validateBody(updateTaskSchema), asyncHandler(tasksController.update));

tasksRoutes.post('/:id/assign', requirePermission('tasks.assign'), validateBody(assignTaskSchema), asyncHandler(tasksController.assign));
tasksRoutes.post('/:id/reassign', requirePermission('tasks.reassign'), validateBody(assignTaskSchema), asyncHandler(tasksController.reassign));
tasksRoutes.post('/:id/accept', requirePermission('tasks.update'), asyncHandler(tasksController.accept));
tasksRoutes.post('/:id/start', requirePermission('tasks.update'), asyncHandler(tasksController.start));
tasksRoutes.post('/:id/progress', requirePermission('tasks.update'), validateBody(progressSchema), asyncHandler(tasksController.progress));
tasksRoutes.post('/:id/submit', requirePermission('tasks.submit'), validateBody(submitSchema), asyncHandler(tasksController.submit));
tasksRoutes.post('/:id/upload', requirePermission('tasks.submit'), upload.single('file'), asyncHandler(tasksController.upload));
tasksRoutes.post('/:id/resubmit', requirePermission('tasks.submit'), validateBody(submitSchema), asyncHandler(tasksController.resubmit));
tasksRoutes.post('/:id/review', requirePermission('tasks.review'), asyncHandler(tasksController.review));
tasksRoutes.post('/:id/revision', requirePermission('tasks.revision'), validateBody(revisionSchema), asyncHandler(tasksController.revision));
tasksRoutes.post('/:id/approve', requirePermission('tasks.approve'), asyncHandler(tasksController.approve));
tasksRoutes.post('/:id/publish', requirePermission('tasks.publish'), asyncHandler(tasksController.publish));
tasksRoutes.post('/:id/complete', requirePermission('tasks.complete'), asyncHandler(tasksController.complete));
tasksRoutes.post('/:id/comments', requirePermission('tasks.view'), validateBody(commentSchema), asyncHandler(tasksController.comment));

tasksRoutes.get('/:id/history', requirePermission('tasks.view'), asyncHandler(tasksController.history));
tasksRoutes.get('/:id/versions', requirePermission('tasks.view'), asyncHandler(tasksController.versions));
