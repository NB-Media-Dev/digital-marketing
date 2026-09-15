import http from 'http';
import { createApp } from './app';
import { env } from './config/env';
import { initSocket } from './config/socket';
import { connectDatabase, disconnectDatabase } from './database/prisma';
import { startJobs } from './jobs';

async function bootstrap(): Promise<void> {
  const app = createApp();
  const server = http.createServer(app);

  // Socket.IO shares the HTTP server.
  initSocket(server);

  await connectDatabase();
  startJobs();

  server.listen(env.port, () => {
    // eslint-disable-next-line no-console
    console.log(`MarkOps API ready on http://localhost:${env.port}${env.apiPrefix}`);
  });

  const shutdown = async (signal: string) => {
    // eslint-disable-next-line no-console
    console.log(`\n${signal} received — shutting down…`);
    server.close();
    await disconnectDatabase();
    process.exit(0);
  };
  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

bootstrap().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Failed to start server:', err);
  process.exit(1);
});
