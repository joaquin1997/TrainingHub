import type { ExerciseLastPerformance, ExerciseLastSet, WeightUnit } from '@workout/domain';

import { formatDuration } from '@/lib/format';
import { kgToInputString } from '@/lib/weight';

import type { WorkoutSetDraft } from './workoutDraftStore';

/**
 * "Last time" for each of today's sets, paired by kind (spec 0031 FR-18): the
 * n-th warm-up set gets last time's n-th warm-up set, the n-th working set
 * last time's n-th working set (drop and failure sets are working sets).
 * `undefined` where last time had no set of that kind at that position
 * (FR-19). A server that does not say which sets were warm-ups makes every
 * last set a working set, so warm-ups pair with nothing (EF-8).
 */
export function pairLastSets(
  lastSets: readonly ExerciseLastSet[],
  entries: readonly Pick<WorkoutSetDraft, 'type'>[],
): (ExerciseLastSet | undefined)[] {
  const ordered = lastSets.slice().sort((left, right) => left.order - right.order);
  const lastWarmUps = ordered.filter((set) => set.isWarmup === true);
  const lastWorking = ordered.filter((set) => set.isWarmup !== true);
  let warmUps = 0;
  let working = 0;

  return entries.map((set) =>
    set.type === 'warmup' ? lastWarmUps[warmUps++] : lastWorking[working++],
  );
}

/**
 * The performance with its sets paired to today's sets and renumbered to
 * their `order`, so anything that looks last time up by order (the
 * "previous" column) reads the paired set.
 */
export function pairedPerformance(
  performance: ExerciseLastPerformance | null | undefined,
  entries: readonly Pick<WorkoutSetDraft, 'type' | 'order'>[],
): ExerciseLastPerformance | null {
  if (!performance) {
    return null;
  }

  const paired = pairLastSets(performance.sets, entries);
  return {
    performedAt: performance.performedAt,
    sets: entries.flatMap((set, index) => {
      const last = paired[index];
      return last ? [{ ...last, order: set.order }] : [];
    }),
  };
}

/**
 * The set with the placeholders its routine targets give it (as at the start
 * of the workout), used when a set paired with last time loses its
 * counterpart: a value borrowed from the other kind must not linger (FR-19).
 */
export function withTargetPlaceholders(set: WorkoutSetDraft, unit: WeightUnit): WorkoutSetDraft {
  return {
    ...set,
    repsPlaceholder:
      set.maxReps !== undefined
        ? String(set.maxReps)
        : set.minReps !== undefined
          ? String(set.minReps)
          : undefined,
    weightPlaceholder:
      set.targetWeight !== undefined ? kgToInputString(set.targetWeight, unit) : undefined,
    durationPlaceholder:
      set.targetDurationSeconds !== undefined
        ? formatDuration(set.targetDurationSeconds)
        : undefined,
    distancePlaceholder:
      set.targetDistanceMeters !== undefined ? String(set.targetDistanceMeters) : undefined,
    repsLeftPlaceholder: undefined,
    repsRightPlaceholder: undefined,
    lastTimePaired: undefined,
  };
}
