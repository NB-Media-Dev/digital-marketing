import { Request, Response } from 'express';
import { conversionService } from '../services/conversion.service';
import { transactionService } from '../services/transaction.service';
import { sendSuccess, sendCreated } from '../utils/response';
import { ctxFrom } from '../utils/ctx';

export const conversionsController = {
  async list(_req: Request, res: Response) {
    sendSuccess(res, await conversionService.list());
  },
  async dashboard(_req: Request, res: Response) {
    sendSuccess(res, await conversionService.dashboard());
  },
  async create(req: Request, res: Response) {
    sendCreated(res, await conversionService.create(req.body, ctxFrom(req)), 'Conversion recorded.');
  },
  async update(req: Request, res: Response) {
    sendSuccess(res, await conversionService.update(req.params.id, req.body, ctxFrom(req)), 'Conversion updated.');
  },
};

export const transactionsController = {
  async list(_req: Request, res: Response) {
    sendSuccess(res, await transactionService.list());
  },
  async create(req: Request, res: Response) {
    sendCreated(res, await transactionService.create(req.body, ctxFrom(req)), 'Payment recorded.');
  },
  async update(req: Request, res: Response) {
    sendSuccess(res, await transactionService.updateStatus(req.params.id, req.body.paymentStatus, ctxFrom(req)), 'Transaction updated.');
  },
};
