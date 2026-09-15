import { Request, Response } from 'express';
import { telecallingService } from '../services/telecalling.service';
import { followupService } from '../services/followup.service';
import { sendSuccess, sendCreated } from '../utils/response';
import { ctxFrom } from '../utils/ctx';

export const telecallingController = {
  async dashboard(req: Request, res: Response) {
    sendSuccess(res, await telecallingService.myDashboard(ctxFrom(req)));
  },
  async board(_req: Request, res: Response) {
    sendSuccess(res, await telecallingService.board());
  },
  async listCalls(req: Request, res: Response) {
    sendSuccess(res, await telecallingService.listCalls(ctxFrom(req), req.query.leadId as string | undefined));
  },
  async logCall(req: Request, res: Response) {
    sendCreated(res, await telecallingService.logCall(req.body, ctxFrom(req)), 'Call logged.');
  },
  async listFollowups(req: Request, res: Response) {
    const bucket = (req.query.bucket as 'today' | 'overdue' | 'upcoming') ?? 'today';
    sendSuccess(res, await followupService.list(ctxFrom(req), bucket));
  },
  async createFollowup(req: Request, res: Response) {
    sendCreated(res, await followupService.create(req.body, ctxFrom(req)), 'Follow-up scheduled.');
  },
  async completeFollowup(req: Request, res: Response) {
    sendSuccess(res, await followupService.complete(req.params.id, req.body?.remarks, ctxFrom(req)), 'Follow-up completed.');
  },
};
