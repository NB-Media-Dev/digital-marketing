import { Request, Response } from 'express';
import { reportService } from '../services/report.service';
import { dashboardService } from '../services/dashboard.service';
import { sendSuccess } from '../utils/response';
import { toCsv } from '../utils/csv';

export const reportsController = {
  async data(req: Request, res: Response) {
    sendSuccess(res, await reportService.rows(String(req.query.type ?? '')));
  },

  async named(req: Request, res: Response) {
    sendSuccess(res, await reportService.rows(req.params.type));
  },

  async business(_req: Request, res: Response) {
    sendSuccess(res, await reportService.businessReport());
  },

  async exportCsv(req: Request, res: Response) {
    const type = String(req.query.type ?? 'report');
    const rows = await reportService.rows(type);
    const csv = toCsv(rows as Record<string, unknown>[]);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${type}.csv"`);
    res.send(csv);
  },
};

export const dashboardController = {
  async admin(req: Request, res: Response) {
    sendSuccess(res, await dashboardService.adminOverview((req.query.range as 'today' | 'week' | 'month') ?? 'today'));
  },
  async businessFunnel(req: Request, res: Response) {
    sendSuccess(res, await dashboardService.businessFunnel((req.query.range as 'today' | 'week' | 'month') ?? 'month'));
  },
  async needsAttention(_req: Request, res: Response) {
    sendSuccess(res, await dashboardService.needsAttention());
  },
  async activity(_req: Request, res: Response) {
    sendSuccess(res, await dashboardService.activityFeed());
  },
  async pending(_req: Request, res: Response) {
    sendSuccess(res, await dashboardService.pending());
  },
  async businessHealth(_req: Request, res: Response) {
    sendSuccess(res, await dashboardService.businessHealth());
  },
  async today(_req: Request, res: Response) {
    sendSuccess(res, await dashboardService.today());
  },
};
