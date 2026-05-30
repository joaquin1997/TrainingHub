import type { Exercise, MuscleGroup } from '@workout/domain';

import { apiRequest } from '@/lib/http';

type CreateExerciseInput = {
  name: string;
  primaryMuscleGroupIds: string[];
  secondaryMuscleGroupIds: string[];
};

export const exercisesClient = {
  list() {
    return apiRequest<Exercise[]>('/exercises');
  },
  getById(exerciseId: string) {
    return apiRequest<Exercise>(`/exercises/${exerciseId}`);
  },
  listMuscleGroups() {
    return apiRequest<MuscleGroup[]>('/muscle-groups');
  },
  create(input: CreateExerciseInput) {
    return apiRequest<Exercise>('/exercises', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },
};
