import { prisma } from '../database/prisma';
import { socketService } from './socket.service';
import { EVENTS } from '../socket/events';

interface NotifyInput {
  userId: string;
  type: string;
  title: string;
  message: string;
  entityType?: string;
  entityId?: string;
}

export const notificationService = {
  /** Persist a notification and push it to the user in real time. */
  async notify(input: NotifyInput) {
    const n = await prisma.notification.create({ data: { ...input, isRead: false } });
    socketService.toUser(input.userId, EVENTS.notification.created, n);
    return n;
  },

  list(userId: string, unreadOnly = false) {
    return prisma.notification.findMany({
      where: { userId, ...(unreadOnly ? { isRead: false } : {}) },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  },

  unreadCount(userId: string) {
    return prisma.notification.count({ where: { userId, isRead: false } });
  },

  async markRead(userId: string, id: string) {
    await prisma.notification.updateMany({ where: { id, userId }, data: { isRead: true } });
    return { ok: true };
  },

  async markAllRead(userId: string) {
    await prisma.notification.updateMany({ where: { userId, isRead: false }, data: { isRead: true } });
    return { ok: true };
  },
};
