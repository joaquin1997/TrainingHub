import { describe, expect, it } from 'vitest';

import { tokenSubject } from './tokenSubject';

const encode = (value: object) =>
  btoa(JSON.stringify(value)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

const token = (claims: object) => `${encode({ alg: 'HS256' })}.${encode(claims)}.signature`;

describe('tokenSubject', () => {
  it('reads the subject of a token', () => {
    expect(tokenSubject(token({ sub: 'user-abc', iat: 1 }))).toBe('user-abc');
  });

  it('handles base64url payloads that need padding', () => {
    expect(tokenSubject(token({ sub: 'u?>~', x: 'ab' }))).toBe('u?>~');
  });

  it('returns null without a subject or for garbage', () => {
    expect(tokenSubject(token({ iat: 1 }))).toBeNull();
    expect(tokenSubject('not-a-token')).toBeNull();
    expect(tokenSubject('a.%%%.c')).toBeNull();
  });
});
