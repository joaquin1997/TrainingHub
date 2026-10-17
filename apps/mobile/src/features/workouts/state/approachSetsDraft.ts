import type { WeightUnit } from '@workout/domain';

import { approachSets, type ApproachSet } from '@/lib/approachSets';
import { trackingFields } from '@/lib/tracking';

import {
  effectiveSetValue,
  nextDraftId,
  type WorkoutExerciseDraft,
  type WorkoutSessionDraft,
  type WorkoutSetDraft,
} from './workoutDraftStore';

/**
 * Why approach sets cannot be offered (spec 0024 EF-1, EF-2; 0031 FR-5):
 * `noWeight` when the first working set has no weight (or there is none),
 * `tooLight` when it is too close to the empty bar for any.
 */
export type ApproachSetsNotice = 'noWeight' | 'tooLight';

/** What adding would do, shown before anything changes (spec 0031 FR-1). */
export type ApproachSetsPreview = {
  /** The catalog exercise previewed, to refuse a confirm after a replace (EF-1). */
  exerciseId: string;
  /** Lightest first, in the display unit. */
  sets: ApproachSet[];
  /** The first working set's weight they were worked out from. */
  workingWeight: number;
  unit: WeightUnit;
  /** Warm-up sets already ahead of the first working set; they stay (FR-4). */
  keptWarmUps: number;
};

export type ApproachSetsPreviewResult =
  | ({ outcome: 'preview' } & ApproachSetsPreview)
  | { outcome: ApproachSetsNotice };

/** Only weight & reps exercises have a rep scheme to ramp. */
export function canAddApproachSets(exercise: Pick<WorkoutExerciseDraft, 'trackingType'>) {
  const fields = trackingFields(exercise.trackingType);
  return fields.includes('weight') && fields.includes('reps');
}

/** A generated warm-up the action can still take back: untouched and not done. */
function isRemovable(set: WorkoutSetDraft) {
  return set.generatedWarmup === true && set.type === 'warmup' && !set.done;
}

/**
 * What the warm-up action does now (spec 0031 FR-9, FR-11): remove while a
 * generated warm-up that is not done remains, else add. Only done generated
 * sets left → add (EF-3).
 */
export function warmUpActionFor(exercise: Pick<WorkoutExerciseDraft, 'entries'>): 'add' | 'remove' {
  return exercise.entries.some(isRemovable) ? 'remove' : 'add';
}

function firstWorkingIndex(entries: readonly WorkoutSetDraft[]) {
  return entries.findIndex((set) => set.type !== 'warmup');
}

/**
 * The approach sets adding would insert, worked out from the first working
 * set's weight — typed, else its ghosted value — in the session's display
 * unit (0024 FR-1, FR-3). Pure: the draft is not touched until the person
 * confirms (0031 FR-1, FR-2).
 */
export function previewApproachSets(
  workoutDraft: WorkoutSessionDraft,
  workoutExerciseId: string,
): ApproachSetsPreviewResult {
  const exercise = workoutDraft.exercises.find((item) => item.id === workoutExerciseId);
  const firstWorking = exercise ? firstWorkingIndex(exercise.entries) : -1;
  const working = exercise?.entries[firstWorking];

  if (!exercise || !working || !canAddApproachSets(exercise)) {
    return { outcome: 'noWeight' };
  }

  const workingWeight = Number(effectiveSetValue(working.weightKg, working.weightPlaceholder));
  if (!(workingWeight > 0)) {
    return { outcome: 'noWeight' };
  }

  const unit = workoutDraft.unit ?? 'kg';
  const sets = approachSets(workingWeight, unit);
  if (sets.length === 0) {
    return { outcome: 'tooLight' };
  }

  return {
    outcome: 'preview',
    exerciseId: exercise.exerciseId,
    sets,
    workingWeight,
    unit,
    keptWarmUps: firstWorking,
  };
}

/**
 * Adds exactly the previewed sets (FR-3, EF-2), typed `warmup` with their
 * values typed in and the generated mark, right before the first working set
 * — after any warm-ups already there — or at the end when there is no working
 * set. Nothing is removed or changed (FR-4). When the exercise is gone or was
 * replaced since the preview, the draft is returned as it was (EF-1).
 */
export function confirmApproachSets(
  workoutDraft: WorkoutSessionDraft,
  workoutExerciseId: string,
  preview: ApproachSetsPreview,
): WorkoutSessionDraft {
  const exercise = workoutDraft.exercises.find((item) => item.id === workoutExerciseId);
  if (!exercise || exercise.exerciseId !== preview.exerciseId) {
    return workoutDraft;
  }

  const firstWorking = firstWorkingIndex(exercise.entries);
  const at = firstWorking === -1 ? exercise.entries.length : firstWorking;
  const newSets: WorkoutSetDraft[] = preview.sets.map((set) => ({
    id: nextDraftId(`${exercise.id}-set`),
    order: 0,
    reps: String(set.reps),
    weightKg: String(set.weight),
    done: false,
    type: 'warmup',
    generatedWarmup: true,
  }));
  const entries = [
    ...exercise.entries.slice(0, at),
    ...newSets,
    ...exercise.entries.slice(at),
  ].map((set, index) => ({ ...set, order: index + 1 }));

  return replaceEntries(workoutDraft, workoutExerciseId, entries);
}

/**
 * Removes every generated warm-up of the exercise that is not done (FR-9).
 * Sets the person typed, generated sets they changed, and done ones stay
 * (FR-10, EF-6). Works with no working set left (EF-4).
 */
export function removeGeneratedWarmUps(
  workoutDraft: WorkoutSessionDraft,
  workoutExerciseId: string,
): WorkoutSessionDraft {
  const exercise = workoutDraft.exercises.find((item) => item.id === workoutExerciseId);
  if (!exercise || warmUpActionFor(exercise) !== 'remove') {
    return workoutDraft;
  }

  const entries = exercise.entries
    .filter((set) => !isRemovable(set))
    .map((set, index) => ({ ...set, order: index + 1 }));

  return replaceEntries(workoutDraft, workoutExerciseId, entries);
}

function replaceEntries(
  workoutDraft: WorkoutSessionDraft,
  workoutExerciseId: string,
  entries: WorkoutSetDraft[],
): WorkoutSessionDraft {
  return {
    ...workoutDraft,
    exercises: workoutDraft.exercises.map((item) =>
      item.id === workoutExerciseId ? { ...item, entries } : item,
    ),
  };
}
