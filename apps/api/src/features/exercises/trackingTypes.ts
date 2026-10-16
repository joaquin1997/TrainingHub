import type { ExerciseTrackingType } from '@workout/domain';

/** Every tracking type an exercise can have (spec 0021). */
export const EXERCISE_TRACKING_TYPES: readonly ExerciseTrackingType[] = [
  'weight_reps',
  'reps',
  'duration',
  'weight_duration',
  'distance_duration',
];

export function isExerciseTrackingType(value: unknown): value is ExerciseTrackingType {
  return (
    typeof value === 'string' &&
    (EXERCISE_TRACKING_TYPES as readonly string[]).includes(value)
  );
}

/** A stored value as a tracking type; anything unknown reads as weight & reps. */
export function toExerciseTrackingType(
  value: string | null | undefined,
): ExerciseTrackingType {
  return isExerciseTrackingType(value) ? value : 'weight_reps';
}
