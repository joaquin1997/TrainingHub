import { describe, expect, it } from 'vitest';

import { googleDisplayName, resolveGoogleSignIn } from './googleSignIn.js';

const identity = { subject: 's1', email: 'ana@gmail.com', emailVerified: true, name: 'Ana' };

describe('resolveGoogleSignIn (spec 0039)', () => {
  it('signs in to the account the identity belongs to, even if its email changed (FR-4)', () => {
    expect(resolveGoogleSignIn({ identity, identityOwnerId: 7n, emailOwnerId: 9n })).toEqual({
      kind: 'existing',
      userId: 7n,
    });
  });

  it('links a verified email to the existing account (FR-5, AC-3)', () => {
    expect(resolveGoogleSignIn({ identity, identityOwnerId: null, emailOwnerId: 9n })).toEqual({
      kind: 'link',
      userId: 9n,
    });
  });

  it('never links an unverified email (EF-4)', () => {
    expect(
      resolveGoogleSignIn({
        identity: { ...identity, emailVerified: false },
        identityOwnerId: null,
        emailOwnerId: 9n,
      }),
    ).toEqual({ kind: 'conflict' });
  });

  it('creates an account otherwise (FR-6)', () => {
    expect(resolveGoogleSignIn({ identity, identityOwnerId: null, emailOwnerId: null })).toEqual({
      kind: 'create',
    });
  });

  it('names the account from Google, else from the email', () => {
    expect(googleDisplayName(identity)).toBe('Ana');
    expect(googleDisplayName({ ...identity, name: undefined })).toBe('ana');
  });
});
