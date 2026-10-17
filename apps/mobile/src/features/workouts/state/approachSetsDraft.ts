import { approachSets } from '@/lib/approachSets';
import { trackingFields } from '@/lib/tracking';

import {
  effectiveSetValue,
  nextDraftId,
  type WorkoutExerciseDraft,
  type WorkoutSessionDraft,
  type WorkoutSetDraft,
} from './workoutDraftStore';

/**
 * What adding approach sets did (spec 0024): `noWeight` when the first
 * working set has no weight yet (EF-1), `tooLight` when the working weight is
 * too close to the empty bar for any. Both leave the workout as it was.
 */
export type ApproachSetsOutcome = 'added' | 'noWeight' | 'tooLight';

/** Only weight & reps exercises have a rep scheme to ramp. */
export function canAddApproachSets(exercise: Pick<WorkoutExerciseDraft, 'trackingType'>) {
  const fields = trackingFields(exercise.trackingType);
  return fields.includes('weight') && fields.includes('reps');
}

/**
 * Adds approach sets before the exercise's first working set, worked out from
 * that set's weight — typed, else its ghosted value — in the session's
 * display unit (FR-1, FR-3). They are ordinary sets typed `warmup` with their
 * values typed in, so they save as warm-ups (FR-2) and can be edited or
 * removed like any set (FR-4). Warm-up sets ahead of the first working set
 * that are not done are replaced, so a second tap regenerates; done ones
 * stay.
 */
export function addApproachSets(
  workoutDraft: WorkoutSessionDraft,
  workoutExerciseId: string,
): { draft: WorkoutSessionDraft; outcome: ApproachSetsOutcome } {
  const exercise = workoutDraft.exercises.find((item) => item.id === workoutExerciseId);
  const firstWorking = exercise?.entries.findIndex((set) => set.type !== 'warmup') ?? -1;
  const working = exercise?.entries[firstWorking];

  if (!exercise || !working || !canAddApproachSets(exercise)) {
    return { draft: workoutDraft, outcome: 'noWeight' };
  }

  const workingWeight = Number(effectiveSetValue(working.weightKg, working.weightPlaceholder));
  if (!(workingWeight > 0)) {
    return { draft: workoutDraft, outcome: 'noWeight' };
  }

  const generated = approachSets(workingWeight, workoutDraft.unit ?? 'kg');
  if (generated.length === 0) {
    return { draft: workoutDraft, outcome: 'tooLight' };
  }

  const ahead = exercise.entries.slice(0, firstWorking).filter((set) => set.done);
  const newSets: WorkoutSetDraft[] = generated.map((set) => ({
    id: nextDraftId(`${exercise.id}-set`),
    order: 0,
    reps: String(set.reps),
    weightKg: String(set.weight),
    done: false,
    type: 'warmup',
  }));
  const entries = [...ahead, ...newSets, ...exercise.entries.slice(firstWorking)].map(
    (set, index) => ({ ...set, order: index + 1 }),
  );

  return {
    draft: {
      ...workoutDraft,
      exercises: workoutDraft.exercises.map((item) =>
        item.id === workoutExerciseId ? { ...item, entries } : item,
      ),
    },
    outcome: 'added',
  };
}
