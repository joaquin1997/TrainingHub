import type { WeightUnit } from '@workout/domain';
import { useEffect, useRef, useState } from 'react';

import { workoutsClient } from '@/features/workouts/api/workoutsClient';
import {
  loadWorkoutComparison,
  type ComparedWorkout,
  type WorkoutComparison,
} from '@/features/workouts/utils/workoutComparison';

/**
 * The finished workout compared with the saved history (spec 0034 FR-24):
 * one `GET /workouts` when the summary opens. Null while loading and on any
 * failure — the summary then shows without a comparison, no banner (EF-5).
 */
export function useWorkoutComparison(
  current: ComparedWorkout | null,
  unit: WeightUnit,
): WorkoutComparison | null {
  const [comparison, setComparison] = useState<WorkoutComparison | null>(null);
  // The workout is rebuilt on every render; load once per finished workout.
  const latest = useRef(current);
  latest.current = current;
  const key = current ? `${current.routineId ?? ''}|${current.startedAt}` : null;

  useEffect(() => {
    const workout = latest.current;
    if (!key || !workout) {
      setComparison(null);
      return;
    }

    let isActive = true;
    void loadWorkoutComparison(workout, unit, () => workoutsClient.list()).then((result) => {
      if (isActive) {
        setComparison(result);
      }
    });

    return () => {
      isActive = false;
    };
  }, [key, unit]);

  return comparison;
}
