import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * What this device remembers about itself, not about the account (spec 0037
 * "What is remembered, and where"): AsyncStorage on iOS, Android and web.
 * A storage failure reads as "nothing remembered" and never throws.
 */
const PREFIX = 'traininghub.device.';

export const deviceStore = {
  async get(key: string): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(PREFIX + key);
    } catch {
      return null;
    }
  },
  async set(key: string, value: string): Promise<void> {
    try {
      await AsyncStorage.setItem(PREFIX + key, value);
    } catch {
      // Not remembered: at worst the question is asked again.
    }
  },
};

/** Keys, so every place that reads one writes the same. */
export const deviceKeys = {
  /** The first run was finished or skipped by this account here (FR-3). */
  firstRunDone: (userId: string) => `firstRun.done.${userId}`,
  /** "Not now" was answered to the rest-alert question (FR-9). */
  restAlertsNotNow: 'restAlerts.notNow',
  /** Workout identities whose records were already celebrated (FR-16). */
  celebratedWorkouts: 'celebratedWorkouts',
};
