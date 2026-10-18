import { describe, expect, it } from 'vitest';

import {
  NEW_ACCOUNT_SETTINGS,
  firstRunDecision,
  isAccountSetUp,
  languageToSave,
  preselectedUnit,
} from './firstRunRules';

const fresh = { settings: NEW_ACCOUNT_SETTINGS, routineCount: 0, workoutCount: 0 };

describe('isAccountSetUp (FR-2, AC-9)', () => {
  it('is false for a new account', () => {
    expect(isAccountSetUp(fresh)).toBe(false);
  });

  it('is true with a routine, a workout or any non-default setting', () => {
    expect(isAccountSetUp({ ...fresh, routineCount: 1 })).toBe(true);
    expect(isAccountSetUp({ ...fresh, workoutCount: 3 })).toBe(true);
    expect(isAccountSetUp({ ...fresh, settings: { ...NEW_ACCOUNT_SETTINGS, unit: 'lb' } })).toBe(true);
    expect(
      isAccountSetUp({ ...fresh, settings: { ...NEW_ACCOUNT_SETTINGS, defaultRestSeconds: 120 } }),
    ).toBe(true);
    expect(isAccountSetUp({ ...fresh, settings: { ...NEW_ACCOUNT_SETTINGS, language: 'en' } })).toBe(
      true,
    );
  });
});

describe('firstRunDecision (FR-1)', () => {
  it('shows it to a new account on a device where it was not done', () => {
    expect(firstRunDecision({ done: false, setUp: false, hasActiveWorkout: false })).toBe('show');
  });

  it('never shows it again once done (FR-3, AC-8)', () => {
    expect(firstRunDecision({ done: true, setUp: false, hasActiveWorkout: false })).toBe('skip');
  });

  it('records it as done for a set-up account without showing it (FR-2)', () => {
    expect(firstRunDecision({ done: false, setUp: true, hasActiveWorkout: false })).toBe('record');
  });

  it('lets a workout in progress win, recording nothing (FR-1.3, AC-15)', () => {
    expect(firstRunDecision({ done: false, setUp: false, hasActiveWorkout: true })).toBe('skip');
  });

  it('skips this time when set-up cannot be told (EF-2, AC-12)', () => {
    expect(firstRunDecision({ done: false, setUp: null, hasActiveWorkout: false })).toBe('skip');
  });
});

describe('preselections', () => {
  it('preselects pounds only for the US system (FR-7, AC-2)', () => {
    expect(preselectedUnit('us')).toBe('lb');
    expect(preselectedUnit('metric')).toBe('kg');
    expect(preselectedUnit('uk')).toBe('kg');
    expect(preselectedUnit(null)).toBe('kg');
  });

  it('keeps following the device when its language is kept (FR-6, AC-1, AC-3)', () => {
    expect(languageToSave('es', 'es')).toBeNull();
    expect(languageToSave('en', 'es')).toBe('en');
  });
});
