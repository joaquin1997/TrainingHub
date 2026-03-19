import type { AuthProviderId, AuthServerProvider } from '@workout/domain';

import { appleAuthProvider } from './appleAuthProvider.js';

export const authProviders: AuthServerProvider[] = [appleAuthProvider];

export function findAuthProvider(providerId: AuthProviderId) {
  return authProviders.find((provider) => provider.id === providerId);
}

// TODO: Add Google, email/password, and OIDC providers when those flows are requested.

