import type {
  CreateExerciseInput,
  Exercise,
  ExerciseDeletionImpact,
  MuscleGroup,
  SetExerciseTrackingTypeInput,
  SetExerciseUnilateralInput,
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
  /** Marks the exercise as done one side at a time, or not (spec 0022). */
  setUnilateral(exerciseId: string, input: SetExerciseUnilateralInput) {
    return apiRequest<Exercise>(`/exercises/${exerciseId}/unilateral`, {
      method: 'PUT',
      body: JSON.stringify(input),
    });
  },
  /** Changes what the exercise's sets record (spec 0030 FR-12). */
  setTrackingType(exerciseId: string, input: SetExerciseTrackingTypeInput) {
    return apiRequest<Exercise>(`/exercises/${exerciseId}/tracking-type`, {
      method: 'PUT',
      body: JSON.stringify(input),
    });
  },
  removePhoto(exerciseId: string) {
    return apiRequest<void>(`/exercises/${exerciseId}/photo`, { method: 'DELETE' });
  },
  /** What deleting the creator's custom exercise touches (spec 0033 FR-3). */
  getDeletionImpact(exerciseId: string) {
    return apiRequest<ExerciseDeletionImpact>(`/exercises/${exerciseId}/deletion-impact`);
  },
  /**
   * Deletes the creator's custom exercise (spec 0033). `inActiveWorkout` keeps
   * it for the workout in progress on this device even if it was never saved.
   */
  remove(exerciseId: string, options: { inActiveWorkout: boolean }) {
    const query = options.inActiveWorkout ? '?inActiveWorkout=true' : '';
    return apiRequest<void>(`/exercises/${exerciseId}${query}`, { method: 'DELETE' });
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
