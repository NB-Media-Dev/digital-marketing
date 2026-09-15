import { Request, Response } from 'express';
import { adService } from '../services/ad.service';
import { sendSuccess, sendCreated } from '../utils/response';
import { ctxFrom } from '../utils/ctx';

export const adsController = {
  async list(_req: Request, res: Response) {
    sendSuccess(res, await adService.list());
  },
  async syncLogs(_req: Request, res: Response) {
    sendSuccess(res, await adService.syncLogs());
  },
  async create(req: Request, res: Response) {
    sendCreated(res, await adService.create(req.body, ctxFrom(req)), 'Ad created.');
  },
  async update(req: Request, res: Response) {
    sendSuccess(res, await adService.update(req.params.id, req.body, ctxFrom(req)), 'Ad updated.');
  },
  async sync(req: Request, res: Response) {
    const log = await adService.sync('MANUAL', req.user!.id);
    sendSuccess(res, log, log.message ?? 'Sync complete.');
  },
};
