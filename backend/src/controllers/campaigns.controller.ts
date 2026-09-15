import { Request, Response } from 'express';
import { campaignService } from '../services/campaign.service';
import { sendSuccess, sendCreated } from '../utils/response';
import { ctxFrom } from '../utils/ctx';

export const campaignsController = {
  async list(_req: Request, res: Response) {
    sendSuccess(res, await campaignService.list());
  },
  async performance(_req: Request, res: Response) {
    sendSuccess(res, await campaignService.performance());
  },
  async create(req: Request, res: Response) {
    sendCreated(res, await campaignService.create(req.body, ctxFrom(req)), 'Campaign created.');
  },
  async update(req: Request, res: Response) {
    sendSuccess(res, await campaignService.update(req.params.id, req.body, ctxFrom(req)), 'Campaign updated.');
  },
};
