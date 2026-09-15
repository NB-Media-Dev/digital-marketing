import { Request, Response } from 'express';
import { designerService } from '../services/designer.service';
import { sendSuccess } from '../utils/response';

export const designersController = {
  async list(_req: Request, res: Response) {
    sendSuccess(res, await designerService.list());
  },
  async workload(_req: Request, res: Response) {
    sendSuccess(res, await designerService.workloadBoard());
  },
  async detail(req: Request, res: Response) {
    sendSuccess(res, await designerService.detail(req.params.id));
  },
  async performance(req: Request, res: Response) {
    sendSuccess(res, await designerService.performance(req.params.id));
  },
  async tasks(req: Request, res: Response) {
    sendSuccess(res, await designerService.tasksFor(req.params.id));
  },
};
