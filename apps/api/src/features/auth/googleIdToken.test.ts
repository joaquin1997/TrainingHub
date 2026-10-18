import { generateKeyPairSync, sign } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { configuredGoogleClientIds, createGoogleIdTokenVerifier } from './googleIdToken.js';

const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const jwk = { ...publicKey.export({ format: 'jwk' }), kid: 'k1', alg: 'RS256', use: 'sig' };
const NOW = Date.UTC(2026, 9, 18, 12);

function token(payload: Record<string, unknown>, kid = 'k1', key = privateKey) {
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', kid, typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = sign('RSA-SHA256', Buffer.from(`${header}.${body}`), key).toString('base64url');
  return `${header}.${body}.${signature}`;
}

const valid = {
  iss: 'https://accounts.google.com',
  aud: 'ios-client',
  sub: '1234567890',
  email: 'Ana@Gmail.com',
  email_verified: true,
  name: 'Ana Pérez',
  exp: NOW / 1000 + 600,
};

const verifier = () =>
  createGoogleIdTokenVerifier({
    clientIds: ['ios-client', 'web-client'],
    fetchKeys: async () => [jwk],
    now: () => NOW,
  });

describe('Google ID token verification (spec 0039 FR-3, AC-7)', () => {
  it('accepts a token signed by Google for this app', async () => {
    expect(await verifier()(token(valid))).toEqual({
      subject: '1234567890',
      email: 'ana@gmail.com',
      emailVerified: true,
      name: 'Ana Pérez',
    });
  });

  it('refuses an expired token, another app, another issuer', async () => {
    const verify = verifier();
    expect(await verify(token({ ...valid, exp: NOW / 1000 - 3600 }))).toBeNull();
    expect(await verify(token({ ...valid, aud: 'someone-else' }))).toBeNull();
    expect(await verify(token({ ...valid, iss: 'https://evil.example' }))).toBeNull();
  });

  it('refuses a token signed with another key, or an unknown key id', async () => {
    const other = generateKeyPairSync('rsa', { modulusLength: 2048 }).privateKey;
    const verify = verifier();
    expect(await verify(token(valid, 'k1', other))).toBeNull();
    expect(await verify(token(valid, 'unknown'))).toBeNull();
    expect(await verify('not.a.token')).toBeNull();
  });

  it('reads an unverified email as such', async () => {
    expect((await verifier()(token({ ...valid, email_verified: false })))?.emailVerified).toBe(false);
  });
});

describe('configuredGoogleClientIds', () => {
  it('reads a comma list, empty when unset', () => {
    expect(configuredGoogleClientIds(' a , b ,')).toEqual(['a', 'b']);
    expect(configuredGoogleClientIds(undefined)).toEqual([]);
  });
});
