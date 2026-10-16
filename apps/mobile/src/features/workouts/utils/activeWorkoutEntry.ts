import {
  countWorkoutSets,
  type WorkoutSessionDraft,
} from '@/features/workouts/state/workoutDraftStore';

export type ActiveWorkoutEntry = 'resume' | 'fetch' | 'none';

/**
 * How the active-workout screen opens (spec 0010 FR-6):
 * - an active workout exists → resume it, with no network round-trip, whatever
 *   routine the link names (there is only one active workout, and starting
 *   another would overwrite logged sets);
 * - none, but a routine is named → fetch it and start;
 * - neither → nothing to show.
 */
export function resolveActiveWorkoutEntry(
  activeWorkout: WorkoutSessionDraft | null,
  routineId: string | undefined,
): ActiveWorkoutEntry {
  if (activeWorkout) {
    return 'resume';
  }

  return routineId ? 'fetch' : 'none';
}

export type RoutineStart = 'start' | 'open' | 'ask';

/**
 * What tapping Start on a routine does (spec 0019):
 * - nothing active → start it;
 * - it is the active workout's routine → open that workout, no question
 *   (FR-5);
 * - another workout is active → ask before replacing it (FR-3).
 */
export function resolveRoutineStart(
  activeWorkout: WorkoutSessionDraft | null,
  routineId: string,
): RoutineStart {
  if (!activeWorkout) {
    return 'start';
  }

  return activeWorkout.routineId === routineId ? 'open' : 'ask';
}

export type SwitchOutcome = 'save' | 'discard';

/**
 * What "finish and start" does with the current workout (FR-4): saved when at
 * least one set is done, discarded otherwise — finishing never saves an empty
 * workout.
 */
export function resolveSwitchOutcome(
  activeWorkout: WorkoutSessionDraft,
): SwitchOutcome {
  return countWorkoutSets(activeWorkout).done > 0 ? 'save' : 'discard';
}
