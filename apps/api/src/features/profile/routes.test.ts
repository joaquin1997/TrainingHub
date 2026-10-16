import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./repository.js', () => ({
  getProfile: vi.fn(),
  updateProfile: vi.fn(),
  setProfilePhoto: vi.fn(),
}));
vi.mock('../../infrastructure/userContext.js', () => ({
  resolveUserPublicId: vi.fn(async () => 'user-test'),
}));

import { createApp } from '../../app.js';
import { getProfile, setProfilePhoto, updateProfile } from './repository.js';
import { decodeJpegBase64, parseProfileUpdate, PHOTO_MAX_BYTES } from './validation.js';

const app = createApp({ logger: false });

const profile = {
  displayName: 'Joaquin',
  email: 'j@example.com',
  bio: null,
  heightCm: 180,
  photoDataUrl: null,
};

const jpegBase64 = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 1, 2, 3]).toString('base64');

beforeEach(() => {
  vi.clearAllMocks();
});

afterAll(async () => {
  await app.close();
});

describe('parseProfileUpdate', () => {
  it('trims fields, clears an empty bio and keeps absent fields absent', () => {
    expect(parseProfileUpdate({ displayName: '  Ana ', bio: '  ' })).toEqual({
      ok: true,
      value: { displayName: 'Ana', bio: null },
    });
  });

  it('accepts a height in range and null to clear it', () => {
    expect(parseProfileUpdate({ heightCm: 180 })).toEqual({ ok: true, value: { heightCm: 180 } });
    expect(parseProfileUpdate({ heightCm: null })).toEqual({ ok: true, value: { heightCm: null } });
  });

  it('rejects a 4 m height with its range (EF-2)', () => {
    expect(parseProfileUpdate({ heightCm: 400 })).toEqual({
      ok: false,
      error: { message: expect.any(String), field: 'heightCm', min: 50, max: 272 },
    });
  });

  it('rejects an empty display name and an overlong bio', () => {
    expect(parseProfileUpdate({ displayName: ' ' }).ok).toBe(false);
    expect(parseProfileUpdate({ bio: 'x'.repeat(301) }).ok).toBe(false);
    expect(parseProfileUpdate('nope').ok).toBe(false);
  });
});

describe('decodeJpegBase64', () => {
  it('accepts JPEG bytes', () => {
    const result = decodeJpegBase64({ imageBase64: jpegBase64 });
    expect(result.ok).toBe(true);
  });

  it('rejects a PNG, non-base64 text and an oversized photo', () => {
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0, 0]).toString('base64');
    expect(decodeJpegBase64({ imageBase64: png })).toMatchObject({ ok: false, status: 400 });
    expect(decodeJpegBase64({ imageBase64: 'not base64!' })).toMatchObject({ ok: false, status: 400 });
    const big = Buffer.alloc(PHOTO_MAX_BYTES + 1, 0xff).toString('base64');
    expect(decodeJpegBase64({ imageBase64: big })).toMatchObject({ ok: false, status: 413 });
  });
});

describe('profile routes', () => {
  it('GET /profile returns the caller profile', async () => {
    vi.mocked(getProfile).mockResolvedValue(profile);

    const response = await app.inject({ method: 'GET', url: '/profile' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual(profile);
    expect(getProfile).toHaveBeenCalledWith('user-test');
  });

  it('PUT /profile answers 400 with the range on a bad height', async () => {
    const response = await app.inject({
      method: 'PUT',
      url: '/profile',
      payload: { heightCm: 0 },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({ field: 'heightCm', min: 50, max: 272 });
    expect(updateProfile).not.toHaveBeenCalled();
  });

  it('PUT /profile/photo stores the decoded bytes for the caller', async () => {
    vi.mocked(setProfilePhoto).mockResolvedValue({ ...profile, photoDataUrl: 'data:image/jpeg;base64,x' });

    const response = await app.inject({
      method: 'PUT',
      url: '/profile/photo',
      payload: { imageBase64: jpegBase64 },
    });

    expect(response.statusCode).toBe(200);
    const [userId, bytes] = vi.mocked(setProfilePhoto).mock.calls[0]!;
    expect(userId).toBe('user-test');
    expect(Buffer.from(bytes!).toString('base64')).toBe(jpegBase64);
  });

  it('DELETE /profile/photo removes it', async () => {
    vi.mocked(setProfilePhoto).mockResolvedValue(profile);

    const response = await app.inject({ method: 'DELETE', url: '/profile/photo' });

    expect(response.statusCode).toBe(200);
    expect(setProfilePhoto).toHaveBeenCalledWith('user-test', null);
  });
});
