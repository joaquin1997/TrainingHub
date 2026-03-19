const mockExercises = [
  {
    id: 'exercise-barbell-back-squat',
    name: 'Barbell Back Squat',
    description: 'Compound lower-body exercise with a barbell on the upper back.',
    primaryMuscleGroups: ['quadriceps', 'glutes'],
    equipment: ['barbell', 'rack'],
    isSystemDefined: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'exercise-flat-bench-press',
    name: 'Flat Bench Press',
    description: 'Compound pressing exercise performed on a flat bench.',
    primaryMuscleGroups: ['chest', 'triceps'],
    equipment: ['barbell', 'bench'],
    isSystemDefined: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
];

export function listMockExercises() {
  // TODO: Replace mock data reads with Prisma-backed persistence when the data layer is introduced.
  return mockExercises;
}

export function findMockExerciseById(id: string) {
  // TODO: Replace mock data reads with Prisma-backed persistence when the data layer is introduced.
  return mockExercises.find((exercise) => exercise.id === id);
}

