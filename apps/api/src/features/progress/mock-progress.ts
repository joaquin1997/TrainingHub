const mockExerciseProgress = {
  'exercise-flat-bench-press': {
    exerciseId: 'exercise-flat-bench-press',
    latestWeightKg: 65,
    latestReps: 8,
    personalBestWeightKg: 70,
    personalBestReps: 10,
    trend: 'stable',
    lastUpdatedAt: '2026-01-05T00:00:00.000Z',
  },
  'exercise-barbell-back-squat': {
    exerciseId: 'exercise-barbell-back-squat',
    latestWeightKg: 100,
    latestReps: 5,
    personalBestWeightKg: 110,
    personalBestReps: 6,
    trend: 'up',
    lastUpdatedAt: '2026-01-04T00:00:00.000Z',
  },
} as const;

export function findMockExerciseProgress(exerciseId: string) {
  // TODO: Replace placeholder progress reads with Prisma-backed workout aggregation.
  return mockExerciseProgress[exerciseId as keyof typeof mockExerciseProgress];
}

