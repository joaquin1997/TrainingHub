import { findMockExerciseById } from '@/features/routines/mocks/mockRoutines';

const mockProgressByExerciseId = {
  'exercise-flat-bench-press': {
    exerciseId: 'exercise-flat-bench-press',
    latestWeightKg: 65,
    latestReps: 8,
    personalBestWeightKg: 70,
    personalBestReps: 10,
    trendLabel: 'Stable trend',
    lastUpdatedLabel: 'Updated 2 days ago',
  },
  'exercise-barbell-back-squat': {
    exerciseId: 'exercise-barbell-back-squat',
    latestWeightKg: 100,
    latestReps: 5,
    personalBestWeightKg: 110,
    personalBestReps: 6,
    trendLabel: 'Trending up',
    lastUpdatedLabel: 'Updated 3 days ago',
  },
} as const;

export function listMockExerciseProgress() {
  return Object.values(mockProgressByExerciseId).map((progress) => ({
    ...progress,
    exerciseName:
      findMockExerciseById(progress.exerciseId)?.name ?? 'Unknown exercise',
  }));
}

export function findMockExerciseProgress(exerciseId?: string) {
  if (!exerciseId) {
    return undefined;
  }

  const progress =
    mockProgressByExerciseId[
      exerciseId as keyof typeof mockProgressByExerciseId
    ];

  if (!progress) {
    return undefined;
  }

  return {
    ...progress,
    exerciseName:
      findMockExerciseById(progress.exerciseId)?.name ?? 'Unknown exercise',
  };
}

