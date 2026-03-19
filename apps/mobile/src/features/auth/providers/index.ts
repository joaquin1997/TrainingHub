import type { AuthClientProvider, AuthProviderId } from '@workout/domain';

import { appleAuthProvider } from './appleAuthProvider';

export const authProviders: AuthClientProvider[] = [appleAuthProvider];

export function findAuthProvider(providerId: AuthProviderId) {
  return authProviders.find((provider) => provider.id === providerId);
}

// TODO: Add Google, email/password, and OIDC client providers when those flows are requested.

