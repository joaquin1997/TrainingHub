import type {
  AppleAuthCredential,
  AuthClientProvider,
} from '@workout/domain';

export const appleAuthProvider: AuthClientProvider = {
  id: 'apple',
  label: 'Continue with Apple',
  async createCredential() {
    const credential: AppleAuthCredential = {
      providerId: 'apple',
      identityToken: 'TODO-apple-identity-token',
      authorizationCode: 'TODO-apple-authorization-code',
    };

    // TODO: Replace placeholder credential creation with Expo Apple Authentication.
    return credential;
  },
};

