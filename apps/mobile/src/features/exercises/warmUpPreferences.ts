import { exercisesClient } from './api/exercisesClient';
import { createWarmUpPreferenceStore } from './warmUpPreferenceStore';

export const warmUpPreferenceStore = createWarmUpPreferenceStore({
  read: (id) => exercisesClient.getWarmUpPreferences(id),
  write: (id, value) => exercisesClient.setWarmUpPreferences(id, value),
});
