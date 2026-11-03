import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./warmUpPreferencesRepository.js', () => ({ exerciseWarmUpPreferences: vi.fn() }));
vi.mock('../../infrastructure/sessionUser.js', () => ({
  findSessionUser: vi.fn(async (publicId: string) => ({ publicId })),
}));
import { createApp } from '../../app.js';
import { exerciseWarmUpPreferences } from './warmUpPreferencesRepository.js';

const app = createApp({ logger: false });
const defaults = { loadingKind: null, approachSetCount: null, incrementKg: null };
beforeAll(() => app.ready());
afterAll(() => app.close());
beforeEach(() => { vi.clearAllMocks(); });
const request = (method: 'GET' | 'PUT', payload?: unknown, owner = 'alice') => app.inject({
  method, url: '/exercises/e1/warm-up-preferences',
  headers: owner ? { authorization: `Bearer ${app.jwt.sign({ sub: owner })}` } : {},
  ...(payload === undefined ? {} : { payload: payload as Record<string, unknown> }),
});

describe('personal warm-up preferences', () => {
  it.each(['GET', 'PUT'] as const)('requires validated identity for %s', async (method) => {
    expect((await request(method, method === 'PUT' ? defaults : undefined, '')).statusCode).toBe(401);
    expect(exerciseWarmUpPreferences).not.toHaveBeenCalled();
  });
  it('returns confirmed defaults and passes only authenticated owner to persistence', async () => {
    vi.mocked(exerciseWarmUpPreferences).mockResolvedValue(defaults);
    expect((await request('GET')).json()).toEqual(defaults);
    expect(exerciseWarmUpPreferences).toHaveBeenCalledWith('alice', 'e1');
  });
  it.each([
    {}, { ...defaults, approachSetCount: 0 }, { ...defaults, approachSetCount: 6 },
    { ...defaults, approachSetCount: 2.5 }, { ...defaults, incrementKg: 0 },
    { ...defaults, incrementKg: -1 }, { ...defaults, incrementKg: '2.5' },
    { ...defaults, loadingKind: 'cable' }, { ...defaults, userId: 'bob' },
  ])('rejects malformed values without writing: %j', async (payload) => {
    expect((await request('PUT', payload)).statusCode).toBe(400);
    expect(exerciseWarmUpPreferences).not.toHaveBeenCalled();
  });
  it('accepts explicit overrides and null resets', async () => {
    const input = { loadingKind: 'machine' as const, approachSetCount: 5 as const, incrementKg: 2.5 };
    vi.mocked(exerciseWarmUpPreferences).mockResolvedValue(input);
    expect((await request('PUT', input, 'bob')).json()).toEqual(input);
    expect(exerciseWarmUpPreferences).toHaveBeenCalledWith('bob', 'e1', input);
    vi.mocked(exerciseWarmUpPreferences).mockResolvedValue(defaults);
    expect((await request('PUT', defaults)).json()).toEqual(defaults);
  });
  it('does not distinguish private, retired or missing exercises', async () => {
    vi.mocked(exerciseWarmUpPreferences).mockResolvedValue(null);
    expect((await request('GET')).statusCode).toBe(404);
    expect((await request('PUT', defaults)).statusCode).toBe(404);
  });
});
