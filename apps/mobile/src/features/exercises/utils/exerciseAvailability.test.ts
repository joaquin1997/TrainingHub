import { describe, expect, it, vi } from 'vitest';

// Avoid loading expo-constants (pulled in by @/config/api) in the node test env.
vi.mock('@/config/api', () => ({ API_BASE_URL: 'http://test.local' }));

import { ApiError } from '@/lib/http';

import {
  isExerciseGone,
  isUnknownRoutineExerciseError,
  needsAvailabilityCheck,
  UNKNOWN_ROUTINE_EXERCISES_MESSAGE,
} from './exerciseAvailability';

describe('needsAvailabilityCheck', () => {
  it('checks custom exercises only', () => {
    expect(needsAvailabilityCheck({ isSystemDefined: false })).toBe(true);
    expect(needsAvailabilityCheck({ isSystemDefined: true })).toBe(false);
  });
});

describe('isExerciseGone (spec 0015 EF-4)', () => {
  it('is true only for a "not found" answer', () => {
    expect(isExerciseGone(new ApiError('Exercise not found', 404))).toBe(true);
  });

  it('lets the choice through on anything that is not proof', () => {
    expect(isExerciseGone(new ApiError('boom', 500))).toBe(false);
    expect(isExerciseGone(new ApiError('Unauthorized', 401))).toBe(false);
    expect(isExerciseGone(new TypeError('Network request failed'))).toBe(false);
    expect(isExerciseGone(undefined)).toBe(false);
  });
});

describe('isUnknownRoutineExerciseError', () => {
  it('recognises the refusal of a routine with an unknown exercise', () => {
    expect(
      isUnknownRoutineExerciseError(new ApiError(UNKNOWN_ROUTINE_EXERCISES_MESSAGE, 400)),
    ).toBe(true);
  });

  it('ignores other refusals and failures', () => {
    expect(isUnknownRoutineExerciseError(new ApiError('Invalid routine payload', 400))).toBe(
      false,
    );
    expect(
      isUnknownRoutineExerciseError(new ApiError(UNKNOWN_ROUTINE_EXERCISES_MESSAGE, 500)),
    ).toBe(false);
    expect(isUnknownRoutineExerciseError(new Error(UNKNOWN_ROUTINE_EXERCISES_MESSAGE))).toBe(
      false,
    );
  });
});
