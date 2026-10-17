import { useSyncExternalStore } from 'react';

import {
  getActiveWorkout,
  subscribeActiveWorkout,
  type WorkoutSessionDraft,
} from '@/features/workouts/state/workoutDraftStore';

/** The active workout, re-rendering on every change to the store. */
export function useActiveWorkout(): WorkoutSessionDraft | null {
  return useSyncExternalStore(
    subscribeActiveWorkout,
    getActiveWorkout,
    getActiveWorkout,
  );
}
