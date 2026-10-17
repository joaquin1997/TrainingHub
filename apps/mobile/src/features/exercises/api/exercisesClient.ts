import type {
  CreateExerciseInput,
  Exercise,
  MuscleGroup,
  SetProfilePhotoInput,
} from '@workout/domain';

import { apiRequest } from '@/lib/http';

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
  /** Sets the photo of a custom exercise (same JPEG/base64 upload as the profile photo). */
  setPhoto(exerciseId: string, input: SetProfilePhotoInput) {
    return apiRequest<void>(`/exercises/${exerciseId}/photo`, {
      method: 'PUT',
      body: JSON.stringify(input),
    });
  },
  removePhoto(exerciseId: string) {
    return apiRequest<void>(`/exercises/${exerciseId}/photo`, { method: 'DELETE' });
  },
  listFavorites() {
    return apiRequest<string[]>('/exercises/favorites');
  },
  addFavorite(exerciseId: string) {
    return apiRequest<void>(`/exercises/${exerciseId}/favorite`, {
      method: 'PUT',
    });
  },
  removeFavorite(exerciseId: string) {
    return apiRequest<void>(`/exercises/${exerciseId}/favorite`, {
      method: 'DELETE',
    });
  },
};
