import { Router } from 'express';
import { searchService } from '../services/search.service';
import { authenticate } from '../middleware/auth.middleware';
import { asyncHandler, sendSuccess } from '../utils/response';
import { ctxFrom } from '../utils/ctx';

export const searchRoutes = Router();
searchRoutes.use(authenticate);

searchRoutes.get('/', asyncHandler(async (req, res) => {
  const q = String(req.query.q ?? '');
  sendSuccess(res, await searchService.search(q, ctxFrom(req)));
}));
