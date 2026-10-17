import type { WorkoutSessionDraft } from '@/features/workouts/state/workoutDraftStore';

import { recordNotice } from './liveRecordBadges';

/**
 * What a tick on the phone should feel like (spec 0034 FR-4): `record` when
 * the set just marked done earned a record badge — instead of the set-done
 * tap, never both — `setDone` for any other tick, nothing for an untick.
 * Records are judged as the badges are (spec 0032): with no starting records
 * loaded there is no record feedback (EF-3), and a record found later never
 * reaches here, so it never buzzes retroactively.
 */
export function tickFeedback(
  previous: WorkoutSessionDraft,
  next: WorkoutSessionDraft,
  workoutSetId: string,
): 'record' | 'setDone' | null {
  const doneIn = (draft: WorkoutSessionDraft) =>
    draft.exercises.some((exercise) =>
      exercise.entries.some((set) => set.id === workoutSetId && set.done),
    );

  if (doneIn(previous) || !doneIn(next)) {
    return null;
  }

  return recordNotice(previous, next)?.workoutSetId === workoutSetId ? 'record' : 'setDone';
}
