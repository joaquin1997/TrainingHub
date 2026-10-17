import type { AppLanguage, UserSettings, WeightUnit } from '@workout/domain';

/** The settings a new account gets (spec 0037 FR-2). */
export const NEW_ACCOUNT_SETTINGS: UserSettings = {
  unit: 'kg',
  defaultRestSeconds: 90,
  language: null,
};

/**
 * Whether an account is set up (FR-2): any routine, any saved workout, or a
 * setting that differs from what a new account gets.
 */
export function isAccountSetUp({
  settings,
  routineCount,
  workoutCount,
}: {
  settings: UserSettings;
  routineCount: number;
  workoutCount: number;
}): boolean {
  return (
    routineCount > 0 ||
    workoutCount > 0 ||
    settings.unit !== NEW_ACCOUNT_SETTINGS.unit ||
    settings.defaultRestSeconds !== NEW_ACCOUNT_SETTINGS.defaultRestSeconds ||
    settings.language !== null
  );
}

/** Only the settings already say "set up": no need to list anything. */
export function settingsAlreadySetUp(settings: UserSettings): boolean {
  return isAccountSetUp({ settings, routineCount: 0, workoutCount: 0 });
}

/**
 * What to do at sign-in or app start (FR-1 – FR-3):
 * - `show` the first run;
 * - `record` it as done without showing it (the account is set up);
 * - `skip` this time, recording nothing (a workout in progress wins, or
 *   whether the account is set up is unknown — EF-2).
 */
export function firstRunDecision({
  done,
  setUp,
  hasActiveWorkout,
}: {
  done: boolean;
  /** Null when it could not be told (offline, server error, older server). */
  setUp: boolean | null;
  hasActiveWorkout: boolean;
}): 'show' | 'record' | 'skip' {
  if (done) {
    return 'skip';
  }
  if (setUp === true) {
    return 'record';
  }
  if (setUp === null || hasActiveWorkout) {
    return 'skip';
  }
  return 'show';
}

/**
 * Pounds where the device's region measures in US units, kilograms
 * elsewhere (FR-7). [ASSUMPTION: the UK system is not, as UK gyms load in kg.]
 */
export function preselectedUnit(measurementSystem: string | null | undefined): WeightUnit {
  return measurementSystem === 'us' ? 'lb' : 'kg';
}

/**
 * The language to save on finishing (FR-6): keeping the device's language
 * keeps "follow the device" (null); only a different choice is saved.
 */
export function languageToSave(chosen: AppLanguage, device: AppLanguage): AppLanguage | null {
  return chosen === device ? null : chosen;
}

/** The rest values offered by the first run (FR-7), in seconds. */
export const FIRST_RUN_REST_OPTIONS = [60, 90, 120, 180] as const;
