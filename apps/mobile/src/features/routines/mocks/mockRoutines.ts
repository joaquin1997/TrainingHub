import type { Exercise } from '@workout/domain';

const mockExercises: Exercise[] = [
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
];

export function findMockExerciseById(exerciseId?: string) {
  if (!exerciseId) {
    return undefined;
  }

  return mockExercises.find((exercise) => exercise.id === exerciseId);
}
