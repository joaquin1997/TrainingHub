import { useCallback, useSyncExternalStore } from 'react';
import { useAuth } from '@/features/auth/AuthContext';
import { savedWorkoutVersion, subscribeWorkoutInvalidation } from './workoutInvalidation';
export function useWorkoutInvalidationVersion() {
  const { user } = useAuth();
  return useSyncExternalStore(
    useCallback((changed) => subscribeWorkoutInvalidation(() => changed()), []),
    useCallback(() => savedWorkoutVersion(user?.id ?? ''), [user?.id]), () => 0,
  );
}
