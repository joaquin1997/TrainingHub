import type { WorkoutSessionDraft } from '@/features/workouts/state/workoutDraftStore';

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
