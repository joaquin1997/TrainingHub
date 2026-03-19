import type {
  AppleAuthCredential,
  AuthServerProvider,
  AuthSession,
} from '@workout/domain';

export const appleAuthProvider: AuthServerProvider = {
  id: 'apple',
  async authenticate(credential) {
    if (credential.providerId !== 'apple') {
      return null;
    }

    const appleCredential = credential as AppleAuthCredential;

    if (!appleCredential.identityToken && !appleCredential.authorizationCode) {
      return null;
    }

    const session: AuthSession = {
      user: {
        id: 'user-apple-demo',
        displayName: 'Apple User',
        email: 'apple-user@example.com',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
      account: {
        providerId: 'apple',
        providerSubject: 'apple-subject-demo',
        email: 'apple-user@example.com',
        displayName: 'Apple User',
      },
      accessToken: 'TODO-server-issued-access-token',
      refreshToken: 'TODO-server-issued-refresh-token',
      expiresAt: '2026-01-01T01:00:00.000Z',
    };

    // TODO: Validate Apple tokens and authorization codes against Apple's public keys.
    // TODO: Replace placeholder session issuance with real session persistence and token rotation.
    return session;
  },
};

