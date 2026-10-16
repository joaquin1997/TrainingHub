import type { WorkoutSession, WorkoutSet } from '@workout/domain';

import { isPerformedSet } from './performedSet';

type StatSet = Pick<WorkoutSet, 'reps' | 'weightKg' | 'restSeconds' | 'performed' | 'completedAt'>;
type StatExercise = { sets: StatSet[] };

const setVolumeKg = (set: StatSet) => (set.reps ?? 0) * (set.weightKg ?? 0);

/**
 * Totals of a saved session: every set counts toward `totalSets`, only
 * performed sets toward done sets, volume (kg) and rest (spec 0013).
 */
export function summarizeSession(session: { exercises: StatExercise[] }) {
  let totalSets = 0;
  let doneSets = 0;
  let volumeKg = 0;
  let restSeconds = 0;

  for (const exercise of session.exercises) {
    for (const set of exercise.sets) {
      totalSets += 1;
      if (isPerformedSet(set)) {
        doneSets += 1;
        volumeKg += setVolumeKg(set);
        restSeconds += set.restSeconds ?? 0;
      }
    }
  }

  return { totalSets, doneSets, volumeKg: Math.round(volumeKg), restSeconds };
}

/** Volume (kg) of one exercise's performed sets. */
export function exerciseVolumeKg(exercise: StatExercise) {
  return Math.round(
    exercise.sets.reduce((sum, set) => sum + (isPerformedSet(set) ? setVolumeKg(set) : 0), 0),
  );
}

/** Exercise names in performed order. */
export function sessionExerciseNames(session: Pick<WorkoutSession, 'exercises'>) {
  return session.exercises
    .slice()
    .sort((left, right) => left.order - right.order)
    .map((exercise) => exercise.exerciseName);
}
