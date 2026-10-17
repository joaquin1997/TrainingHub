import {
  moveInGroups,
  removeKeepingGroups,
} from '@/features/routines/utils/supersetGroups';
import type {
  WorkoutExerciseDraft,
  WorkoutSessionDraft,
} from '@/features/workouts/state/workoutDraftStore';

function withExercises(
  draft: WorkoutSessionDraft,
  exercises: WorkoutExerciseDraft[],
): WorkoutSessionDraft {
  return {
    ...draft,
    exercises: exercises.map((exercise, index) =>
      exercise.order === index + 1 ? exercise : { ...exercise, order: index + 1 },
    ),
  };
}

/**
 * Moves an exercise of the active workout a step, superset-aware (spec 0029
 * FR-18 to FR-20): inside its superset, out of it at the edge, or past a whole
 * superset — never into one.
 */
export function moveWorkoutExerciseInGroups(
  draft: WorkoutSessionDraft,
  workoutExerciseId: string,
  direction: 'up' | 'down',
): WorkoutSessionDraft {
  const index = draft.exercises.findIndex((exercise) => exercise.id === workoutExerciseId);
  if (index === -1) {
    return draft;
  }
  return withExercises(draft, moveInGroups(draft.exercises, index, direction));
}

/**
 * Removes an exercise of the active workout (its done sets leave with it); the
 * rest of its superset stays joined with rounds recomputed (FR-21).
 */
export function removeWorkoutExerciseInGroups(
  draft: WorkoutSessionDraft,
  workoutExerciseId: string,
): WorkoutSessionDraft {
  const index = draft.exercises.findIndex((exercise) => exercise.id === workoutExerciseId);
  if (index === -1) {
    return draft;
  }
  return withExercises(draft, removeKeepingGroups(draft.exercises, index));
}
