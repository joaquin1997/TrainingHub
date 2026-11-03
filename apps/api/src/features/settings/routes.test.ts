import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./repository.js', async (importOriginal) => {
  const original = await importOriginal<typeof import('./repository.js')>();
  return {
    ...original,
    getUserSettings: vi.fn(),
    updateUserSettings: vi.fn(async (_user: string, input: object) => ({
      unit: 'kg',
      defaultRestSeconds: 90,
      language: null,
      appearance: 'system',
      ...input,
    })),
  };
});

// Mock persistence only: requests pass through real JWT verification and user resolution.
vi.mock('../../infrastructure/sessionUser.js', () => ({
  findSessionUser: vi.fn(async (publicId: string) => ({ publicId })),
}));

import { createApp } from '../../app.js';
import { fromAppearance, toAppearance, updateUserSettings } from './repository.js';

const app = createApp({ logger: false });
const sessionHeaders = () => ({ authorization: `Bearer ${app.jwt.sign({ sub: 'user-test' })}` });
beforeAll(async () => { await app.ready(); });

beforeEach(() => {
  vi.clearAllMocks();
});

afterAll(async () => {
  await app.close();
});

describe('appearance setting (spec 0038)', () => {
  it('reads a stored null or anything unknown as system', () => {
    expect(toAppearance(null)).toBe('system');
    expect(toAppearance('sepia')).toBe('system');
    expect(toAppearance('light')).toBe('light');
  });

  it('stores system as null and leaves an absent value unchanged', () => {
    expect(fromAppearance('system')).toBeNull();
    expect(fromAppearance('dark')).toBe('dark');
    expect(fromAppearance(undefined)).toBeUndefined();
  });

  it('saves a valid appearance and ignores an invalid one', async () => {
    await app.inject({ headers: sessionHeaders(), method: 'PUT', url: '/settings', payload: { appearance: 'light' } });
    expect(updateUserSettings).toHaveBeenLastCalledWith(
      'user-test',
      expect.objectContaining({ appearance: 'light' }),
    );

    await app.inject({ headers: sessionHeaders(), method: 'PUT', url: '/settings', payload: { appearance: 'sepia' } });
    expect(updateUserSettings).toHaveBeenLastCalledWith(
      'user-test',
      expect.objectContaining({ appearance: undefined }),
    );
  });
});
