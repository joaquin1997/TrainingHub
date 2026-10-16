import type { UpdateUserProfileInput, UserProfile } from '@workout/domain';

import { apiRequest } from '@/lib/http';

export const profileClient = {
  get() {
    return apiRequest<UserProfile>('/profile');
  },
  update(input: UpdateUserProfileInput) {
    return apiRequest<UserProfile>('/profile', {
      method: 'PUT',
      body: JSON.stringify(input),
    });
  },
};
