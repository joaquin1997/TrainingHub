import AsyncStorage from '@react-native-async-storage/async-storage';

import type { ActiveWorkoutStorage } from './activeWorkoutStorage';

const ACTIVE_WORKOUT_KEY = 'traininghub.activeWorkout';

/**
 * AsyncStorage-backed storage: iOS, Android and web (localStorage). Chosen over
 * SecureStore, which may reject values over ~2 KB — a draft easily exceeds
 * that — and over the file system, which has no web support.
 */
export const activeWorkoutStorage: ActiveWorkoutStorage = {
  get: () => AsyncStorage.getItem(ACTIVE_WORKOUT_KEY),
  set: (value) => AsyncStorage.setItem(ACTIVE_WORKOUT_KEY, value),
  clear: () => AsyncStorage.removeItem(ACTIVE_WORKOUT_KEY),
};
