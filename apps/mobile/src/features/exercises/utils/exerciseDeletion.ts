import type { ExerciseDeletionImpact } from '@workout/domain';

/**
 * Deleting a custom exercise (spec 0033): what the confirmation says. Pure,
 * so the wording rules are tested without a screen.
 */

/** One line of the confirmation: an i18n key under `exerciseDeletion`, and its count. */
export type DeletionImpactLine = {
  key:
    | 'exerciseDeletion.unused'
    | 'exerciseDeletion.inRoutines'
    | 'exerciseDeletion.inWorkouts'
    | 'exerciseDeletion.inActiveWorkout'
    | 'exerciseDeletion.disappears';
  count?: number;
};

/**
 * The impact on the person's own data (FR-3), the active workout (FR-4), and
 * what disappears. "Used nowhere" is said explicitly when that is the case.
 */
export function describeDeletionImpact(
  impact: ExerciseDeletionImpact,
  inActiveWorkout: boolean,
): DeletionImpactLine[] {
  const lines: DeletionImpactLine[] = [];

  if (impact.routineCount > 0) {
    lines.push({ key: 'exerciseDeletion.inRoutines', count: impact.routineCount });
  }

  if (impact.workoutCount > 0) {
    lines.push({ key: 'exerciseDeletion.inWorkouts', count: impact.workoutCount });
  }

  if (inActiveWorkout) {
    lines.push({ key: 'exerciseDeletion.inActiveWorkout' });
  }

  if (lines.length === 0) {
    lines.push({ key: 'exerciseDeletion.unused' });
  }

  lines.push({ key: 'exerciseDeletion.disappears' });

  return lines;
}

/** Whether the active workout on this device contains the exercise (FR-4, FR-8). */
export function isInActiveWorkout(
  workout: { exercises: Array<{ exerciseId: string }> } | null | undefined,
  exerciseId: string,
): boolean {
  return workout?.exercises.some((exercise) => exercise.exerciseId === exerciseId) ?? false;
}
