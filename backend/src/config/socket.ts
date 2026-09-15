import { Server as HttpServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import jwt from 'jsonwebtoken';
import { env } from './env';
import { socketOrigin } from './cors';

/**
 * Socket.IO singleton. Clients authenticate with the access token
 * (handshake.auth.token). Each user joins `user:<id>` and `role:<CODE>` rooms
 * so services can target notifications precisely.
 */
let io: SocketServer | null = null;

export function initSocket(httpServer: HttpServer): SocketServer {
  io = new SocketServer(httpServer, {
    cors: { origin: socketOrigin, credentials: true },
  });

  io.use((socket, next) => {
    try {
      const token =
        (socket.handshake.auth?.token as string) ||
        (socket.handshake.headers.authorization ?? '').replace('Bearer ', '');
      const payload = jwt.verify(token, env.jwt.secret) as { sub: string; roleCode: string };
      socket.data.userId = payload.sub;
      socket.data.roleCode = payload.roleCode;
      next();
    } catch {
      next(new Error('unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    socket.join(`user:${socket.data.userId}`);
    socket.join(`role:${socket.data.roleCode}`);
  });

  return io;
}

export function getIo(): SocketServer {
  if (!io) throw new Error('Socket.IO not initialised');
  return io;
}
