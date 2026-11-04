import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { useAuth } from '@/features/auth/AuthContext';
import { apiRequest, ApiError, getAuthToken, isPermanentRejection } from '@/lib/http';
import { getActiveWorkout, setActiveWorkout, type WorkoutSessionDraft } from '../state/workoutDraftStore';
import { createComparisonResource, type ComparisonLoadStates } from './comparisonResource';
import type { ExerciseComparisonReference } from '@workout/domain';

export const STARTING_RECORDS_RETRY_MS = 30_000;
export function useStartingRecords(draft: WorkoutSessionDraft | null) {
  const { user } = useAuth();
  const [states, setStates] = useState<ComparisonLoadStates>({});
  const resource = useRef<ReturnType<typeof createComparisonResource> | null>(null);
  const token = getAuthToken();
  const ids = [...new Set(draft?.exercises.map((exercise) => exercise.exerciseId) ?? [])].sort().join(',');
  useEffect(() => {
    setStates({});
    if (!draft || !user) return;
    const loader = createComparisonResource({
      get: () => getAuthToken() === token ? getActiveWorkout() : null,
      set: setActiveWorkout, changed: setStates,
      list: (exerciseIds, before) => apiRequest<ExerciseComparisonReference[]>(
        `/progress/comparison-references?exerciseIds=${exerciseIds.map(encodeURIComponent).join(',')}&before=${encodeURIComponent(before)}`,
        undefined, { timeoutMs: 15_000 },
      ),
      classify: (error) => isPermanentRejection(error) ? 'refused' : error instanceof ApiError ? 'unavailable' : 'offline',
    });
    resource.current = loader;
    void loader.load();
    const retry = setInterval(() => { if (AppState.currentState === 'active') void loader.load(); }, STARTING_RECORDS_RETRY_MS);
    const listener = AppState.addEventListener('change', (state) => { if (state === 'active') void loader.load(); });
    return () => { loader.stop(); resource.current = null; clearInterval(retry); listener.remove(); };
  }, [draft?.clientId, user?.id, ids, token]);
  return { states, retry: () => { void resource.current?.load(true); } };
}
