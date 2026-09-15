import { PrismaClient } from '@prisma/client';

/**
 * Single PrismaClient instance shared across the app.
 * BigInt is serialised to a Number/String-safe form by the response helper.
 */
export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
});

export async function connectDatabase(): Promise<void> {
  await prisma.$connect();
}

export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
}
