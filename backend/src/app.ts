import express, { Application } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import path from 'path';
import './types/auth.types'; // Express Request augmentation
import { env } from './config/env';
import { corsOptions } from './config/cors';
import { apiRouter } from './routes';
import { errorHandler, notFoundHandler } from './middleware/error.middleware';

/**
 * Builds the Express application. Middleware order:
 * helmet → cors → cookie-parser → json → rate-limit → routes → 404 → error handler.
 * No business logic lives here.
 */
export function createApp(): Application {
  const app = express();

  app.use(helmet());
  app.use(cors(corsOptions));
  app.use(cookieParser());
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true }));

  app.use(rateLimit({ windowMs: 60_000, limit: 300, standardHeaders: true, legacyHeaders: false }));

  // Serve uploaded design files.
  app.use('/uploads', express.static(path.resolve(env.upload.dir)));

  app.use(env.apiPrefix, apiRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
