import type {
  CreateWorkoutSessionInput,
  ExerciseLastPerformance,
  WorkoutSession,
  UpdateWorkoutSessionInput,
} from '@workout/domain';

import { apiRequest } from '@/lib/http';

export const workoutsClient = {
  list() {
    return apiRequest<WorkoutSession[]>('/workouts');
  },
  getById(workoutId: string) {
    return apiRequest<WorkoutSession>(`/workouts/${workoutId}`);
  },
  correct(workoutId: string, input: UpdateWorkoutSessionInput) {
    return apiRequest<WorkoutSession>(`/workouts/${encodeURIComponent(workoutId)}/correction`, {
      method: 'PUT', body: JSON.stringify(input),
    }, { timeoutMs: 20_000 });
  },
  create(input: CreateWorkoutSessionInput) {
    return apiRequest<WorkoutSession>('/workouts', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },
  getLastPerformance(exerciseId: string) {
    return apiRequest<ExerciseLastPerformance>(
      `/workouts/exercises/${exerciseId}/last`,
    );
  },
};
