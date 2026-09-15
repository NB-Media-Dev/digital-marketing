import { Request, Response } from 'express';
import { Priority, TaskStatus } from '@prisma/client';
import { taskService } from '../services/task.service';
import { sendSuccess, sendCreated, sendPaginated } from '../utils/response';
import { getPageParams } from '../utils/pagination';
import { ctxFrom } from '../utils/ctx';
import { TaskListFilters } from '../types/task.types';

export const tasksController = {
  async list(req: Request, res: Response) {
    const params = getPageParams(req);
    const filters: TaskListFilters = {
      status: req.query.status as TaskStatus | undefined,
      priority: req.query.priority as Priority | undefined,
      designerId: req.query.designerId as string | undefined,
      campaignId: req.query.campaignId as string | undefined,
      bucket: req.query.bucket as TaskListFilters['bucket'],
    };
    const { items, meta } = await taskService.list(ctxFrom(req), filters, params);
    sendPaginated(res, items, meta);
  },

  async create(req: Request, res: Response) {
    sendCreated(res, await taskService.create(req.body, ctxFrom(req)), 'Task created.');
  },

  async detail(req: Request, res: Response) {
    sendSuccess(res, await taskService.detail(req.params.id, ctxFrom(req)));
  },

  async update(req: Request, res: Response) {
    sendSuccess(res, await taskService.update(req.params.id, req.body, ctxFrom(req)), 'Task updated.');
  },

  async assign(req: Request, res: Response) {
    sendSuccess(res, await taskService.assign(req.params.id, req.body.designerId, req.body.reason, ctxFrom(req)), 'Task assigned.');
  },

  async reassign(req: Request, res: Response) {
    sendSuccess(res, await taskService.reassign(req.params.id, req.body.designerId, req.body.reason, ctxFrom(req)), 'Task reassigned.');
  },

  async accept(req: Request, res: Response) {
    sendSuccess(res, await taskService.accept(req.params.id, ctxFrom(req)), 'Task accepted.');
  },

  async start(req: Request, res: Response) {
    sendSuccess(res, await taskService.start(req.params.id, ctxFrom(req)), 'Work started.');
  },

  async progress(req: Request, res: Response) {
    sendSuccess(res, await taskService.updateProgress(req.params.id, req.body.progress, req.body.remarks, ctxFrom(req)), 'Progress updated.');
  },

  async submit(req: Request, res: Response) {
    sendSuccess(res, await taskService.submit(req.params.id, req.body, ctxFrom(req)), 'Design submitted.');
  },

  /** Multipart upload → new task version. */
  async upload(req: Request, res: Response) {
    const file = req.file;
    if (!file) return sendSuccess(res, null, 'No file received.', 400);
    const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${file.filename}`;
    const result = await taskService.submit(
      req.params.id,
      { fileName: file.originalname, fileUrl, fileType: file.mimetype, fileSize: file.size, remarks: req.body?.remarks },
      ctxFrom(req),
    );
    return sendSuccess(res, result, 'Design uploaded.');
  },

  async review(req: Request, res: Response) {
    sendSuccess(res, await taskService.review(req.params.id, ctxFrom(req)), 'Task moved to review.');
  },

  async revision(req: Request, res: Response) {
    sendSuccess(res, await taskService.requestRevision(req.params.id, req.body.reason, ctxFrom(req)), 'Revision requested.');
  },

  async resubmit(req: Request, res: Response) {
    sendSuccess(res, await taskService.submit(req.params.id, req.body, ctxFrom(req)), 'Design resubmitted.');
  },

  async approve(req: Request, res: Response) {
    sendSuccess(res, await taskService.approve(req.params.id, ctxFrom(req)), 'Task approved.');
  },

  async publish(req: Request, res: Response) {
    sendSuccess(res, await taskService.publish(req.params.id, ctxFrom(req)), 'Task published.');
  },

  async complete(req: Request, res: Response) {
    sendSuccess(res, await taskService.complete(req.params.id, ctxFrom(req)), 'Task completed.');
  },

  async comment(req: Request, res: Response) {
    sendCreated(res, await taskService.addComment(req.params.id, req.body.message, ctxFrom(req)), 'Comment added.');
  },

  async history(req: Request, res: Response) {
    sendSuccess(res, await taskService.history(req.params.id));
  },

  async versions(req: Request, res: Response) {
    sendSuccess(res, await taskService.versions(req.params.id));
  },
};
