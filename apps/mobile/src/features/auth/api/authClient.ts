import type {
  AuthTokenResponse,
  EmailLoginInput,
  EmailRegisterInput,
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
};
