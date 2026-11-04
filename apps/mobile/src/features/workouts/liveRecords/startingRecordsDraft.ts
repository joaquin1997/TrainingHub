import type { StartingRecords } from '@workout/domain';
import { isStartingRecords } from '@workout/domain/records';

import type { WorkoutSessionDraft } from '@/features/workouts/state/workoutDraftStore';

/**
 * Starting records kept with the active workout (spec 0032 FR-1 – FR-4).
 * Pure helpers over the draft; the loading lives in `useStartingRecords`.
 */

/** The starting records kept for an exercise, or undefined when not loaded (EF-1). */
export function startingRecordsFor(
  draft: WorkoutSessionDraft,
  exerciseId: string,
): StartingRecords | undefined {
  const records = draft.startingRecords?.[exerciseId];
  return isStartingRecords(records, exerciseId) ? records : undefined;
}

/**
 * Exercises in the workout whose starting records are not kept yet, distinct,
 * in workout order: all of them at the start, an added or replacement exercise
 * (FR-2), a draft from before this feature (EF-4), or a load that failed
 * (EF-2).
 */
export function missingStartingRecordIds(draft: WorkoutSessionDraft): string[] {
  return [
    ...new Set(
      draft.exercises
        .map((exercise) => exercise.exerciseId)
        .filter((exerciseId) => !startingRecordsFor(draft, exerciseId)),
    ),
  ];
}

/**
 * Keeps loaded starting records on the draft. An exercise already holding
 * them keeps the ones it has — they never change during the workout (FR-4).
 * Returns the same draft when nothing is added.
 */
export function withStartingRecords(
  draft: WorkoutSessionDraft,
  records: StartingRecords[],
): WorkoutSessionDraft {
  const added = records.filter(
    (record) => isStartingRecords(record) && draft.exercises.some((exercise) => exercise.exerciseId === record.exerciseId) && !startingRecordsFor(draft, record.exerciseId),
  );

  if (added.length === 0) {
    return draft;
  }

  return {
    ...draft,
    startingRecords: {
      ...draft.startingRecords,
      ...Object.fromEntries(added.map((record) => [record.exerciseId, record])),
    },
  };
}
