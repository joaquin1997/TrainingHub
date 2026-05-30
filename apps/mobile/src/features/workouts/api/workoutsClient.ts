import type { CreateWorkoutSessionInput, WorkoutSession } from '@workout/domain';

import { apiRequest } from '@/lib/http';

// TODO: Add auth headers here once the mobile app exchanges provider credentials for app sessions.
export const workoutsClient = {
  list() {
    return apiRequest<WorkoutSession[]>('/workouts');
  },
  getById(workoutId: string) {
    return apiRequest<WorkoutSession>(`/workouts/${workoutId}`);
  },
  create(input: CreateWorkoutSessionInput) {
    return apiRequest<WorkoutSession>('/workouts', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },
};
