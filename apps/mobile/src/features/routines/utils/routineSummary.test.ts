import type { Routine, RoutineExercise } from '@workout/domain';
import { describe, expect, it } from 'vitest';

import {
  getRoutineExerciseNames,
} from './routineSummary';

function makeExercise(name: string, orderIndex: number): RoutineExercise {
  return {
    id: `re-${name}`,
    routineId: 'r1',
    exerciseId: `e-${name}`,
    exerciseName: name,
    orderIndex,
    sets: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

function makeRoutine(exercises: RoutineExercise[]): Routine {
  return {
    id: 'r1',
    userId: 'u1',
    name: 'Routine',
    exercises,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

describe('getRoutineExerciseNames', () => {
  it('returns names ordered by orderIndex', () => {
    const routine = makeRoutine([
      makeExercise('Row', 2),
      makeExercise('Bench', 1),
    ]);

    expect(getRoutineExerciseNames(routine)).toEqual(['Bench', 'Row']);
  });
});
