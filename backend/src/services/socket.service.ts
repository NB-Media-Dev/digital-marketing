import { getIo } from '../config/socket';
import { serialize } from '../utils/response';

/**
 * Real-time emit helpers. Services call these after a business operation so the
 * Angular SocketService receives updates without polling. Payloads are
 * serialised (Decimal/BigInt → number) for safe JSON transport.
 */
function io() {
  try {
    return getIo();
  } catch {
    return null; // socket not initialised (e.g. during tests)
  }
}

export const socketService = {
  toUser(userId: string, event: string, payload: unknown): void {
    io()?.to(`user:${userId}`).emit(event, serialize(payload));
  },
  toRole(roleCode: string, event: string, payload: unknown): void {
    io()?.to(`role:${roleCode}`).emit(event, serialize(payload));
  },
  broadcast(event: string, payload: unknown): void {
    io()?.emit(event, serialize(payload));
  },
};
