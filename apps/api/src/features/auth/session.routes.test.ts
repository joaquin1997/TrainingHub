import { createHmac } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../infrastructure/sessionUser.js', () => ({ findSessionUser: vi.fn() }));
vi.mock('../../infrastructure/prisma.js', () => ({ prisma: { $queryRaw: vi.fn(async () => 1) } }));
vi.mock('../routines/repository.js', () => ({ listRoutines: vi.fn() }));
vi.mock('./repository.js', () => ({
  findUserByEmail: vi.fn(), createEmailUser: vi.fn(),
  mapUser: (user: { publicId: string; displayName: string }) => ({
    id: user.publicId, displayName: user.displayName, createdAt: '', updatedAt: '',
  }),
}));

import { createApp } from '../../app.js';
import { findSessionUser } from '../../infrastructure/sessionUser.js';
import { listRoutines } from '../routines/repository.js';
import { createEmailUser, findUserByEmail } from './repository.js';
import { hashPassword } from './password.js';

const app = createApp({ logger: false });
const user = { publicId: 'ana', displayName: 'Ana', passwordHash: hashPassword('secret123') };
beforeAll(async () => { await app.ready(); });
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(findSessionUser).mockImplementation(async (id) =>
    ['ana', 'ben'].includes(id) ? { ...user, publicId: id } as never : null);
  vi.mocked(findUserByEmail).mockResolvedValue(user as never);
  vi.mocked(createEmailUser).mockResolvedValue(user as never);
  vi.mocked(listRoutines).mockImplementation(async (id) => [{ id: `${id}-routine` }] as never);
});
afterAll(async () => { await app.close(); });
const as = (id: string) => ({ authorization: `Bearer ${app.jwt.sign({ sub: id })}` });

function legacyToken() {
  const head = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify({ sub: 'ana' })).toString('base64url');
  const signature = createHmac('sha256', (process.env.JWT_SECRET?.trim() ? process.env.JWT_SECRET : 'dev-insecure-secret-change-me'))
    .update(`${head}.${body}`).digest('base64url');
  return `${head}.${body}.${signature}`;
}

describe('strict session boundary (0001)', () => {
  const operations = [
    ['GET', '/routines'], ['POST', '/routines'], ['DELETE', '/routines/r1'],
    ['GET', '/workouts'], ['POST', '/workouts'], ['GET', '/progress/exercises'],
    ['GET', '/exercises'], ['PUT', '/exercises/e1/favorite'],
    ['GET', '/profile'], ['GET', '/measurements'], ['GET', '/settings'], ['GET', '/auth/me'],
    ['POST', '/auth/apple/login'],
  ] as const;
  it.each(operations)('rejects anonymous %s %s before reading or writing data', async (method, url) => {
    const response = await app.inject({ method, url });
    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({ message: 'Unauthorized' });
    expect(findSessionUser).not.toHaveBeenCalled();
    expect(listRoutines).not.toHaveBeenCalled();
  });

  it('rejects absent, malformed, expired, unknown and non-expiring credentials identically', async () => {
    const headers = [
      {}, { authorization: 'Bearer junk' }, { authorization: 'Basic junk' },
      { authorization: `Bearer ${app.jwt.sign({ sub: 'ana' }, { expiresIn: -1 })}` },
      as('deleted-account'), { authorization: `Bearer ${legacyToken()}` },
      { authorization: `Bearer ${app.jwt.sign({ sub: '' })}` },
    ];
    for (const header of headers) {
      const result = await app.inject({ method: 'GET', url: '/auth/me', headers: header });
      expect(result.statusCode).toBe(401);
      expect(result.json()).toEqual({ message: 'Unauthorized' });
    }
  });

  it('returns the validated identity without modifying it', async () => {
    const response = await app.inject({ method: 'GET', url: '/auth/me', headers: as('ana') });
    expect(response.statusCode).toBe(200);
    expect(response.json().user).toMatchObject({ id: 'ana', displayName: 'Ana' });
    expect(createEmailUser).not.toHaveBeenCalled();
  });

  it('resolves each request to its verified subject', async () => {
    for (const id of ['ana', 'ben']) {
      const response = await app.inject({ method: 'GET', url: '/routines', headers: as(id) });
      expect(response.json()).toEqual([{ id: `${id}-routine` }]);
      expect(listRoutines).toHaveBeenLastCalledWith(id);
    }
  });

  it('treats an account lookup failure as a server error, preserving the session on clients', async () => {
    vi.mocked(findSessionUser).mockRejectedValueOnce(new Error('database unavailable'));
    const response = await app.inject({ method: 'GET', url: '/auth/me', headers: as('ana') });
    expect(response.statusCode).toBe(500);
  });

  it('protects a future route without a per-route preHandler', async () => {
    const other = createApp({ logger: false });
    other.get('/future-feature', async () => ({ private: true }));
    try {
      expect((await other.inject('/future-feature')).statusCode).toBe(401);
    } finally { await other.close(); }
  });

  it('keeps health public even with an invalid bearer token and query string', async () => {
    const response = await app.inject({ method: 'GET', url: '/health?probe=1', headers: { authorization: 'Bearer invalid' } });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: 'ok', db: 'up' });
  });

  it('does not allow public paths to expose other methods or prefixes', async () => {
    for (const url of ['/health/private', '/auth/login/private', '/auth/me']) {
      expect((await app.inject({ method: 'GET', url })).statusCode).toBe(401);
    }
    expect((await app.inject({ method: 'POST', url: '/health' })).statusCode).toBe(401);
  });

  it.each(['/auth/login', '/auth/register'])('allows anonymous %s and issues 90-day credentials', async (url) => {
    if (url.endsWith('register')) vi.mocked(findUserByEmail).mockResolvedValueOnce(null);
    const response = await app.inject({ method: 'POST', url, payload: { email: 'ana@example.com', password: 'secret123' } });
    expect(response.statusCode).toBe(url.endsWith('register') ? 201 : 200);
    const claims = app.jwt.decode<{ exp: number; iat: number }>(response.json().token)!;
    expect(claims.exp - claims.iat).toBe(90 * 24 * 60 * 60);
  });
});

describe('secret configuration', () => {
  it('refuses a missing or blank secret outside development/test', () => {
    const nodeEnv = process.env.NODE_ENV;
    const secret = process.env.JWT_SECRET;
    try {
      process.env.NODE_ENV = 'production';
      delete process.env.JWT_SECRET;
      expect(() => createApp()).toThrow('JWT_SECRET is required');
      process.env.JWT_SECRET = '   ';
      expect(() => createApp()).toThrow('JWT_SECRET is required');
    } finally {
      if (nodeEnv === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = nodeEnv;
      if (secret === undefined) delete process.env.JWT_SECRET; else process.env.JWT_SECRET = secret;
    }
  });
});
