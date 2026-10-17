import type {
  WorkoutExerciseDraft,
  WorkoutSessionDraft,
} from '@/features/workouts/state/workoutDraftStore';

export interface SetToDo {
  workoutExerciseId: string;
  workoutSetId: string;
}

/**
 * The exercises of the block holding `index`: a run of consecutive exercises
 * sharing a superset group, or the exercise alone (as `exerciseBlockLabels`).
 */
function blockAround(
  exercises: ReadonlyArray<WorkoutExerciseDraft>,
  index: number,
): [number, number] {
  const group = exercises[index]?.supersetGroup;
  if (group === undefined) {
    return [index, index + 1];
  }

  let start = index;
  while (start > 0 && exercises[start - 1]?.supersetGroup === group) {
    start -= 1;
  }
  let end = index + 1;
  while (end < exercises.length && exercises[end]?.supersetGroup === group) {
    end += 1;
  }
  return [start, end];
}

function firstNotDone(exercise: WorkoutExerciseDraft): SetToDo | null {
  const set = exercise.entries.find((entry) => !entry.done);
  return set ? { workoutExerciseId: exercise.id, workoutSetId: set.id } : null;
}

/**
 * The set to do after a rest started by `workoutExerciseId` (spec 0018 FR-5).
 * Within its block, the not-done set with the lowest order, ties going to the
 * exercise listed first — so a superset alternates A1 → B1 → A2. With the block
 * finished, the first set to do after it, then before it; null when all done.
 */
export function nextSetToDo(
  draft: WorkoutSessionDraft,
  workoutExerciseId: string,
): SetToDo | null {
  const exercises = draft.exercises;
  const index = exercises.findIndex((exercise) => exercise.id === workoutExerciseId);
  const [start, end] = index === -1 ? [0, 0] : blockAround(exercises, index);

  let best: { order: number; target: SetToDo } | null = null;
  for (const exercise of exercises.slice(start, end)) {
    for (const set of exercise.entries) {
      if (!set.done && (best === null || set.order < best.order)) {
        best = {
          order: set.order,
          target: { workoutExerciseId: exercise.id, workoutSetId: set.id },
        };
      }
    }
  }
  if (best) {
    return best.target;
  }

  for (const exercise of [...exercises.slice(end), ...exercises.slice(0, start)]) {
    const target = firstNotDone(exercise);
    if (target) {
      return target;
    }
  }
  return null;
}
