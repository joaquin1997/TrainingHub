import type { SetProfilePhotoInput, UpdateUserProfileInput, UserProfile } from '@workout/domain';

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
  /** `imageBase64`: a small JPEG, already reduced on the device. */
  setPhoto(imageBase64: string) {
    const input: SetProfilePhotoInput = { imageBase64 };
    return apiRequest<UserProfile>('/profile/photo', {
      method: 'PUT',
      body: JSON.stringify(input),
    });
  },
  removePhoto() {
    return apiRequest<UserProfile>('/profile/photo', { method: 'DELETE' });
  },
};
