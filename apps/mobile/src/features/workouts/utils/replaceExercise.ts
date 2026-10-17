import type { ExerciseTrackingType } from '@workout/domain';

import { formatDuration } from '@/lib/format';
import type {
  WorkoutExerciseDraft,
  WorkoutSessionDraft,
  WorkoutSetDraft,
} from '@/features/workouts/state/workoutDraftStore';

/** What happens to the old exercise's done sets on replace (spec 0020 EF-1). */
export type DoneSetsChoice = 'keep' | 'drop';

let replaceIdCounter = 0;
/** Time-based seed, as in the draft store, so restored drafts never collide. */
const replaceIdSeed = Date.now().toString(36);

function nextReplaceId(prefix: string) {
  replaceIdCounter += 1;
  return `${prefix}-rep-${replaceIdSeed}-${replaceIdCounter}`;
}

export function countDoneSets(exercise: WorkoutExerciseDraft): number {
  return exercise.entries.filter((set) => set.done).length;
}

/**
 * A fresh, empty set of the same type. Built field by field on purpose: nothing
 * typed or ghosted for the old exercise carries over, so the new exercise shows
 * its own last-time values once they load (FR-3). The routine's rep range,
 * time and distance targets are the slot's plan and stay (spec 0021).
 */
function emptySetLike(set: WorkoutSetDraft, order: number, exerciseId: string): WorkoutSetDraft {
  const targetReps = set.maxReps ?? set.minReps;

  return {
    id: nextReplaceId(`${exerciseId}-set`),
    order,
    reps: '',
    weightKg: '',
    repsPlaceholder: targetReps !== undefined ? String(targetReps) : undefined,
    duration: '',
    distance: '',
    durationPlaceholder:
      set.targetDurationSeconds !== undefined
        ? formatDuration(set.targetDurationSeconds)
        : undefined,
    distancePlaceholder:
      set.targetDistanceMeters !== undefined ? String(set.targetDistanceMeters) : undefined,
    done: false,
    type: set.type,
    minReps: set.minReps,
    maxReps: set.maxReps,
    targetDurationSeconds: set.targetDurationSeconds,
    targetDistanceMeters: set.targetDistanceMeters,
  };
}

/**
 * Replaces one exercise of the active workout by another (spec 0020 FR-3,
 * FR-5, EF-1). The replacement takes the old exercise's position and slot
 * settings (rest, superset), with the same number and types of sets, empty.
 *
 * - `'drop'`: the old exercise and any done sets go; the replacement mirrors
 *   all of its sets.
 * - `'keep'`: the old exercise stays in place with only its done sets, and the
 *   replacement follows it with the sets not yet done — or all of them again
 *   when every set was done.
 *
 * The replacement is not linked to the routine slot (`routineExerciseId`):
 * what is performed is no longer the routine's exercise.
 */
export function replaceExerciseInWorkout(
  workoutDraft: WorkoutSessionDraft,
  workoutExerciseId: string,
  exercise: {
    id: string;
    name: string;
    trackingType?: ExerciseTrackingType;
    isUnilateral?: boolean;
  },
  doneSets: DoneSetsChoice,
): WorkoutSessionDraft {
  const index = workoutDraft.exercises.findIndex(
    (item) => item.id === workoutExerciseId,
  );
  const old = workoutDraft.exercises[index];

  if (!old) {
    return workoutDraft;
  }

  const done = old.entries.filter((set) => set.done);
  const keepDone = doneSets === 'keep' && done.length > 0;
  const remaining = old.entries.filter((set) => !set.done);
  const template = keepDone && remaining.length > 0 ? remaining : old.entries;

  const replacementId = nextReplaceId('we');
  const replacement: WorkoutExerciseDraft = {
    ...old,
    id: replacementId,
    exerciseId: exercise.id,
    exerciseName: exercise.name,
    // The replacement records what the new exercise tracks (spec 0021).
    trackingType: exercise.trackingType,
    isUnilateral: exercise.isUnilateral,
    imagePlaceholderText: undefined,
    routineExerciseId: undefined,
    entries: template.map((set, setIndex) =>
      emptySetLike(set, setIndex + 1, replacementId),
    ),
  };

  const inPlace: WorkoutExerciseDraft[] = keepDone
    ? [
        {
          ...old,
          entries: done.map((set, setIndex) => ({ ...set, order: setIndex + 1 })),
        },
        replacement,
      ]
    : [replacement];

  const exercises = [
    ...workoutDraft.exercises.slice(0, index),
    ...inPlace,
    ...workoutDraft.exercises.slice(index + 1),
  ].map((item, itemIndex) => ({ ...item, order: itemIndex + 1 }));

  return { ...workoutDraft, exercises };
}
