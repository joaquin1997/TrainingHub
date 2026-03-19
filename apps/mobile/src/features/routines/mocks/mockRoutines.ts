import type { Exercise, Routine } from '@workout/domain';

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

const mockRoutines: Routine[] = [
  {
    id: 'routine-upper-a',
    userId: 'user-demo',
    name: 'Upper A',
    description: 'Push and pull focus with basic barbell work.',
    exercises: [
      {
        id: 'routine-exercise-upper-a-bench',
        routineId: 'routine-upper-a',
        exerciseName: 'Flat Bench Press',
        orderIndex: 1,
        sets: [
          {
            id: 'routine-exercise-set-upper-a-bench-1',
            routineExerciseId: 'routine-exercise-upper-a-bench',
            setNumber: 1,
            minReps: 8,
            maxReps: 10,
            targetWeight: 60,
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
          },
          {
            id: 'routine-exercise-set-upper-a-bench-2',
            routineExerciseId: 'routine-exercise-upper-a-bench',
            setNumber: 2,
            minReps: 8,
            maxReps: 10,
            targetWeight: 62.5,
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
          },
        ],
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
      {
        id: 'routine-exercise-upper-a-row',
        routineId: 'routine-upper-a',
        exerciseName: 'Barbell Row',
        orderIndex: 2,
        sets: [
          {
            id: 'routine-exercise-set-upper-a-row-1',
            routineExerciseId: 'routine-exercise-upper-a-row',
            setNumber: 1,
            minReps: 8,
            maxReps: 10,
            targetWeight: 50,
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
          },
        ],
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'routine-lower-a',
    userId: 'user-demo',
    name: 'Lower A',
    description: 'Lower-body day with squat emphasis.',
    exercises: [
      {
        id: 'routine-exercise-lower-a-squat',
        routineId: 'routine-lower-a',
        exerciseName: 'Barbell Back Squat',
        orderIndex: 1,
        sets: [
          {
            id: 'routine-exercise-set-lower-a-squat-1',
            routineExerciseId: 'routine-exercise-lower-a-squat',
            setNumber: 1,
            minReps: 5,
            maxReps: 8,
            targetWeight: 90,
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
          },
        ],
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
      {
        id: 'routine-exercise-lower-a-press',
        routineId: 'routine-lower-a',
        exerciseName: 'Seated Dumbbell Press',
        orderIndex: 2,
        sets: [
          {
            id: 'routine-exercise-set-lower-a-press-1',
            routineExerciseId: 'routine-exercise-lower-a-press',
            setNumber: 1,
            minReps: 10,
            maxReps: 12,
            targetWeight: 20,
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
          },
        ],
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ],
    createdAt: '2026-01-02T00:00:00.000Z',
    updatedAt: '2026-01-02T00:00:00.000Z',
  },
];

export function listMockRoutines() {
  return mockRoutines;
}

export function findMockRoutineById(routineId?: string) {
  if (!routineId) {
    return undefined;
  }

  return mockRoutines.find((routine) => routine.id === routineId);
}

export function getRoutineExerciseNames(routine: Routine) {
  return routine.exercises
    .slice()
    .sort((left, right) => left.orderIndex - right.orderIndex)
    .map((routineExercise) => routineExercise.exerciseName);
}

export function getRoutineExerciseSummary(routine: Routine, maxItems = 2) {
  const exerciseNames = getRoutineExerciseNames(routine);

  if (exerciseNames.length === 0) {
    return 'No exercises yet';
  }

  const visibleNames = exerciseNames.slice(0, maxItems);
  const remainingCount = exerciseNames.length - visibleNames.length;

  if (remainingCount <= 0) {
    return visibleNames.join(', ');
  }

  return `${visibleNames.join(', ')} +${remainingCount} more`;
}

export function findMockExerciseById(exerciseId?: string) {
  if (!exerciseId) {
    return undefined;
  }

  return mockExercises.find((exercise) => exercise.id === exerciseId);
}
