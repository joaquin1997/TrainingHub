import type { Exercise } from '@workout/domain';

const mockExercises: Exercise[] = [
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
  {
    id: 'exercise-barbell-row',
    name: 'Barbell Row',
    description: 'Horizontal pulling exercise with a barbell.',
    primaryMuscleGroups: ['back', 'biceps'],
    equipment: ['barbell'],
    isSystemDefined: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'exercise-seated-dumbbell-press',
    name: 'Seated Dumbbell Press',
    description: 'Overhead pressing exercise performed seated.',
    primaryMuscleGroups: ['shoulders', 'triceps'],
    equipment: ['dumbbells', 'bench'],
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

function createExerciseId(name: string) {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

  return `exercise-custom-${slug || mockExercises.length + 1}`;
}

type CreateMockExerciseInput = {
  name: string;
  description?: string;
};

export function createMockExercise(input: CreateMockExerciseInput) {
  const trimmedName = input.name.trim();
  const existingExercise = mockExercises.find(
    (exercise) => exercise.name.toLowerCase() === trimmedName.toLowerCase(),
  );

  if (existingExercise) {
    return existingExercise;
  }

  const createdAt = new Date().toISOString();
  const exercise: Exercise = {
    id: createExerciseId(trimmedName),
    name: trimmedName,
    description: input.description?.trim() || undefined,
    isSystemDefined: false,
    createdByUserId: 'user-development',
    createdAt,
    updatedAt: createdAt,
  };

  mockExercises.push(exercise);

  return exercise;
}
