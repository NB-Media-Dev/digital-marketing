import { Request, Response } from 'express';
import { LeadStatus } from '@prisma/client';
import { leadService } from '../services/lead.service';
import { sendSuccess, sendCreated, sendPaginated } from '../utils/response';
import { getPageParams } from '../utils/pagination';
import { ctxFrom } from '../utils/ctx';

export const leadsController = {
  async list(req: Request, res: Response) {
    const params = getPageParams(req);
    const { items, meta } = await leadService.list(ctxFrom(req), {
      status: req.query.status as LeadStatus | undefined,
      source: req.query.source as string | undefined,
      campaignId: req.query.campaignId as string | undefined,
      telecallerId: req.query.telecallerId as string | undefined,
    }, params);
    sendPaginated(res, items, meta);
  },
  async funnel(req: Request, res: Response) {
    sendSuccess(res, await leadService.funnel(req.query.campaignId as string | undefined));
  },
  async notInterested(_req: Request, res: Response) {
    sendSuccess(res, await leadService.notInterested());
  },
  async sources(_req: Request, res: Response) {
    sendSuccess(res, await leadService.sourcePerformance());
  },
  async detail(req: Request, res: Response) {
    sendSuccess(res, await leadService.findOne(req.params.id, ctxFrom(req)));
  },
  async history(req: Request, res: Response) {
    sendSuccess(res, await leadService.history(req.params.id));
  },
  async create(req: Request, res: Response) {
    sendCreated(res, await leadService.create(req.body, ctxFrom(req)), 'Lead created.');
  },
  async assign(req: Request, res: Response) {
    sendSuccess(res, await leadService.assign(req.params.id, req.body.telecallerId, ctxFrom(req)), 'Lead assigned.');
  },
  async updateStatus(req: Request, res: Response) {
    sendSuccess(res, await leadService.updateStatus(req.params.id, req.body.status, req.body.remarks, ctxFrom(req)), 'Lead updated.');
  },
};
