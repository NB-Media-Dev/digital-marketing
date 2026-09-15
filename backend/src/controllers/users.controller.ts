import { Request, Response } from 'express';
import { userService } from '../services/user.service';
import { notificationService } from '../services/notification.service';
import { auditService } from '../services/audit.service';
import { sendSuccess, sendCreated, sendPaginated } from '../utils/response';
import { ctxFrom } from '../utils/ctx';

export const usersController = {
  async list(req: Request, res: Response) {
    sendSuccess(res, await userService.list(req.query.role as string | undefined));
  },
  async create(req: Request, res: Response) {
    sendCreated(res, await userService.create(req.body, ctxFrom(req)), 'User created.');
  },
  async update(req: Request, res: Response) {
    sendSuccess(res, await userService.update(req.params.id, req.body, ctxFrom(req)), 'User updated.');
  },
  async disable(req: Request, res: Response) {
    sendSuccess(res, await userService.setStatus(req.params.id, 'DISABLED', ctxFrom(req)), 'User disabled.');
  },
  async enable(req: Request, res: Response) {
    sendSuccess(res, await userService.setStatus(req.params.id, 'ACTIVE', ctxFrom(req)), 'User enabled.');
  },
};

export const notificationsController = {
  async list(req: Request, res: Response) {
    sendSuccess(res, await notificationService.list(req.user!.id, req.query.unread === 'true'));
  },
  async unreadCount(req: Request, res: Response) {
    sendSuccess(res, { count: await notificationService.unreadCount(req.user!.id) });
  },
  async markRead(req: Request, res: Response) {
    sendSuccess(res, await notificationService.markRead(req.user!.id, req.params.id));
  },
  async markAllRead(req: Request, res: Response) {
    sendSuccess(res, await notificationService.markAllRead(req.user!.id));
  },
};

export const auditController = {
  async list(req: Request, res: Response) {
    const { items, meta } = await auditService.list(req);
    sendPaginated(res, items, meta);
  },
};
