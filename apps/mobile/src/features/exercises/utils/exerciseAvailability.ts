import type { Exercise } from '@workout/domain';

import { ApiError } from '@/lib/http';

/**
 * Custom exercises are visible only to their creator (spec 0015). A list
 * loaded before that rule shipped can still offer someone else's exercise;
 * these helpers decide when to re-check and what a failure means (EF-4).
 */

/** Only custom exercises can disappear from a person's catalog; catalog ones are always there. */
export function needsAvailabilityCheck(exercise: Pick<Exercise, 'isSystemDefined'>): boolean {
  return !exercise.isSystemDefined;
}

/**
 * The exercise no longer exists for this person: the API answered "not found".
 * Anything else (offline, server error, signed out) is not proof, so the
 * choice goes ahead rather than blocking the picker.
 */
export function isExerciseGone(error: unknown): boolean {
  return error instanceof ApiError && error.status === 404;
}

/** The API's answer when a routine names an exercise the person may not use. */
export const UNKNOWN_ROUTINE_EXERCISES_MESSAGE = 'Routine references unknown exercises';

/** A routine save refused because one of its exercises is unknown to this person. */
export function isUnknownRoutineExerciseError(error: unknown): boolean {
  return (
    error instanceof ApiError &&
    error.status === 400 &&
    error.message === UNKNOWN_ROUTINE_EXERCISES_MESSAGE
  );
}
