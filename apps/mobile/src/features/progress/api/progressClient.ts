import type {
  ExerciseProgressDetail,
  ExerciseProgressSummary,
  MuscleGroupVolumePoint,
  WeeklyVolumePoint,
} from '@workout/domain';

import { apiRequest } from '@/lib/http';

// TODO: Add auth headers here once the mobile app exchanges provider credentials for app sessions.
export const progressClient = {
  list() {
    return apiRequest<ExerciseProgressSummary[]>('/progress/exercises');
  },
  getByExerciseId(exerciseId: string) {
    return apiRequest<ExerciseProgressDetail>(
      `/progress/exercises/${exerciseId}`,
    );
  },
  weeklyVolume() {
    return apiRequest<WeeklyVolumePoint[]>('/progress/weekly-volume');
  },
  muscleDistribution() {
    return apiRequest<MuscleGroupVolumePoint[]>('/progress/muscle-distribution');
  },
};
