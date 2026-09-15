import request from 'supertest';
import { createApp } from '../src/app';
import { prisma } from '../src/database/prisma';

const app = createApp();

afterAll(async () => {
  await prisma.$disconnect();
});

describe('GET /api/health', () => {
  it('responds with a health envelope', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(['healthy', 'degraded']).toContain(res.body.status);
  });
});

describe('auth guard', () => {
  it('rejects an unauthenticated request to a protected route', async () => {
    const res = await request(app).get('/api/tasks');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });
});
