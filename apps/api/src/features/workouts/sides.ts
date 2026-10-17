/**
 * Left and right reps of a unilateral exercise's set (spec 0022). A set with
 * sides keeps `reps` as their sum, so every volume reads it unchanged; records
 * read the better side through {@link recordReps}.
 */

type SidedReps = {
  reps?: number | null;
  repsLeft?: number | null;
  repsRight?: number | null;
};

/** A side's reps when it was done: a positive whole number, else undefined (EF-1). */
export function parseSideReps(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isInteger(value) && value > 0
    ? value
    : undefined;
}

/**
 * The reps to store for a set: unchanged without sides; with a side, `reps`
 * becomes the sum of the sides that were done.
 */
export function withSideTotal<T extends SidedReps>(set: T): T {
  if (set.repsLeft == null && set.repsRight == null) {
    return set;
  }

  return { ...set, reps: (set.repsLeft ?? 0) + (set.repsRight ?? 0) };
}

/**
 * Reps for records and estimated 1RM: the better side of a set with sides.
 * Shared with the phone's live record badges (spec 0032).
 */
export { recordReps } from '@workout/domain';
