import { afterAll, describe, expect, it, vi } from 'vitest';

vi.mock('./googleIdToken.js', () => ({
  configuredGoogleClientIds: () => [],
  createGoogleIdTokenVerifier: () => vi.fn(),
}));

import { createApp } from '../../app.js';

const app = createApp({ logger: false });

afterAll(async () => {
  await app.close();
});

describe('POST /auth/google without configuration (spec 0039 EF-5, AC-6)', () => {
  it('says Google sign-in is not available', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/auth/google',
      payload: { idToken: 'token' },
    });
    expect(response.statusCode).toBe(503);
    expect(response.json().message).toBe('Google sign-in is not available');
  });
});
