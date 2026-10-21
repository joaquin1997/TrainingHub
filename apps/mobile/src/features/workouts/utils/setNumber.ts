import type { WorkoutSetType } from '@workout/domain';

interface NumberedSet {
  id: string;
  type?: WorkoutSetType;
}

/**
 * A set's number as people count them (spec 0040 FR-1): warm-ups and working
 * sets are numbered apart, each from 1, so the first set after three warm-ups
 * is set 1. `count` is how many sets of that kind the exercise has. Null when
 * the set is not in `sets`.
 */
export function setNumberOf(
  sets: ReadonlyArray<NumberedSet>,
  setId: string,
): { number: number; count: number; isWarmup: boolean } | null {
  const set = sets.find((item) => item.id === setId);
  if (!set) {
    return null;
  }
  const isWarmup = set.type === 'warmup';
  const sameKind = sets.filter((item) => (item.type === 'warmup') === isWarmup);
  return {
    number: sameKind.findIndex((item) => item.id === setId) + 1,
    count: sameKind.length,
    isWarmup,
  };
}
