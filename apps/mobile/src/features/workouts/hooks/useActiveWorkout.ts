import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import {
  getActiveWorkout,
  type WorkoutSessionDraft,
} from '@/features/workouts/state/workoutDraftStore';

/**
 * Reads the in-memory active workout and refreshes it whenever the screen gains
 * focus (the store is a module variable, so changes don't trigger re-renders).
 */
export function useActiveWorkout(): WorkoutSessionDraft | null {
  const [activeWorkout, setActiveWorkout] = useState<WorkoutSessionDraft | null>(
    getActiveWorkout(),
  );

  useFocusEffect(
    useCallback(() => {
      setActiveWorkout(getActiveWorkout());
    }, []),
  );

  return activeWorkout;
}
