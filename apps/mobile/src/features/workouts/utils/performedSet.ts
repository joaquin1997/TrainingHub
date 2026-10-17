import type { WorkoutSet } from '@workout/domain';

/**
 * Whether a saved set counts as performed work (spec 0013). The server owns
 * the rule (done, or any set of a legacy session) and sends it as `performed`;
 * an older API without the flag falls back to "marked done".
 */
export const isPerformedSet = (set: Pick<WorkoutSet, 'performed' | 'completedAt'>) =>
  set.performed ?? Boolean(set.completedAt);
