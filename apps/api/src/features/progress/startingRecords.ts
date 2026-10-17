import type { StartingRecords, StartingRecordType } from '@workout/domain';

import { buildRecordHistories, type ProgressSessionInput } from './aggregate.js';

/** At most this many exercises per request; a workout has far fewer. */
export const STARTING_RECORDS_MAX_IDS = 50;

/**
 * Reads `?exerciseIds=a,b,c`: distinct non-empty ids in order, or null when
 * missing, empty or longer than {@link STARTING_RECORDS_MAX_IDS}.
 */
export function parseExerciseIds(value: unknown): string[] | null {
  if (typeof value !== 'string') {
    return null;
  }

  const ids = [...new Set(value.split(',').map((id) => id.trim()).filter(Boolean))];
  return ids.length > 0 && ids.length <= STARTING_RECORDS_MAX_IDS ? ids : null;
}

/**
 * The starting records of each requested exercise (spec 0032 FR-1): its
 * current best of every single-value type and the most reps at every weight
 * ever lifted, from the same performed working sets as the rest of progress
 * (pass sessions already through `selectPerformedWork`). An exercise never
 * performed comes back empty — loaded, with nothing to beat (FR-8).
 */
export function buildStartingRecords(
  sessions: ProgressSessionInput[],
  exerciseIds: string[],
): StartingRecords[] {
  const ordered = sessions
    .slice()
    .sort((left, right) => left.date.localeCompare(right.date));
  const histories = buildRecordHistories(ordered);

  return exerciseIds.map((exerciseId) => {
    const history = histories.get(exerciseId)?.history;
    const bests: StartingRecords['bests'] = {};

    for (const record of history?.bests ?? []) {
      if (record.type !== 'repsAtWeight') {
        bests[record.type as StartingRecordType] = record.value;
      }
    }

    return {
      exerciseId,
      bests,
      repsAtWeight: [...(history?.repsAtEveryWeight ?? [])].map(([weightKg, reps]) => ({
        weightKg,
        reps,
      })),
    };
  });
}
