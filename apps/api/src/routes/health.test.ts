import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../infrastructure/prisma.js', () => ({
  prisma: { $queryRaw: vi.fn() },
}));

import { createApp } from '../app.js';
import { prisma } from '../infrastructure/prisma.js';

const app = createApp({ logger: false });

beforeEach(() => {
  vi.clearAllMocks();
});

afterAll(async () => {
  await app.close();
});

describe('GET /health', () => {
  it('returns ok when the database responds', async () => {
    vi.mocked(prisma.$queryRaw).mockResolvedValue([{ ok: 1 }] as never);

    const response = await app.inject({ method: 'GET', url: '/health' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: 'ok', db: 'up' });
  });

  it('returns 503 when the database is unreachable', async () => {
    vi.mocked(prisma.$queryRaw).mockRejectedValue(new Error('no db'));

    const response = await app.inject({ method: 'GET', url: '/health' });

    expect(response.statusCode).toBe(503);
    expect(response.json()).toEqual({ status: 'error', db: 'down' });
  });
});
