import type { UpdateUserSettingsInput, UserSettings } from '@workout/domain';

import { apiRequest } from '@/lib/http';

export const settingsClient = {
  get() {
    return apiRequest<UserSettings>('/settings');
  },
  update(input: UpdateUserSettingsInput) {
    return apiRequest<UserSettings>('/settings', {
      method: 'PUT',
      body: JSON.stringify(input),
    });
  },
};
