import type {
  AuthTokenResponse,
  EmailLoginInput,
  EmailRegisterInput,
  GoogleSignInInput,
} from '@workout/domain';

import { apiRequest } from '@/lib/http';

export const authClient = {
  register(input: EmailRegisterInput) {
    return apiRequest<AuthTokenResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },
  login(input: EmailLoginInput) {
    return apiRequest<AuthTokenResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },
  /** Spec 0039: the server verifies the token with Google before trusting it. */
  google(input: GoogleSignInInput) {
    return apiRequest<AuthTokenResponse>('/auth/google', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },
};
