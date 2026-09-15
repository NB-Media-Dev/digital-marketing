import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { authController } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validateBody } from '../middleware/validation.middleware';
import { loginSchema } from '../validators/auth.validator';
import { asyncHandler } from '../utils/response';

const loginLimiter = rateLimit({ windowMs: 60_000, limit: 10, standardHeaders: true, legacyHeaders: false });

export const authRoutes = Router();

authRoutes.post('/login', loginLimiter, validateBody(loginSchema), asyncHandler(authController.login));
authRoutes.post('/refresh', asyncHandler(authController.refresh));
authRoutes.post('/logout', asyncHandler(authController.logout));
authRoutes.get('/me', authenticate, asyncHandler(authController.me));
