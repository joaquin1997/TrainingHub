import type { Routine } from '@workout/domain';

const mockRoutines: Routine[] = [
  {
    id: 'routine-upper-a',
    userId: 'user-demo',
    name: 'Upper A',
    description: 'Simple upper-body template routine.',
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
        ],
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
];

type RoutinePayload = {
  userId?: string;
  name?: string;
  description?: string;
  exercises?: unknown[];
};

export function listMockRoutines() {
  return mockRoutines;
}

export function findMockRoutineById(id: string) {
  return mockRoutines.find((routine) => routine.id === id);
}

export function createMockRoutine(payload: RoutinePayload) {
  const createdAt = new Date().toISOString();

  const routine: Routine = {
    id: `routine-${mockRoutines.length + 1}`,
    userId: payload.userId ?? 'user-demo',
    name: payload.name ?? 'Untitled routine',
    description: payload.description,
    exercises: [],
    createdAt,
    updatedAt: createdAt,
  };

  mockRoutines.push(routine);

  return routine;
}

export function updateMockRoutine(id: string, payload: RoutinePayload) {
  const routine = mockRoutines.find((entry) => entry.id === id);

  if (!routine) {
    return null;
  }

  if (payload.name !== undefined) {
    routine.name = payload.name;
  }

  if (payload.description !== undefined) {
    routine.description = payload.description;
  }

  if (payload.userId !== undefined) {
    routine.userId = payload.userId;
  }

  if (payload.exercises !== undefined) {
    routine.exercises = [];
  }

  routine.updatedAt = new Date().toISOString();

  return routine;
}

export function deleteMockRoutine(id: string) {
  const index = mockRoutines.findIndex((routine) => routine.id === id);

  if (index === -1) {
    return false;
  }

  mockRoutines.splice(index, 1);
  return true;
}
