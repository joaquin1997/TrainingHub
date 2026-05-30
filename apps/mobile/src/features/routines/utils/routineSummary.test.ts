import type { Routine, RoutineExercise } from '@workout/domain';
import { describe, expect, it } from 'vitest';

import {
  getRoutineExerciseNames,
  getRoutineExerciseSummary,
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

describe('getRoutineExerciseSummary', () => {
  it('returns a placeholder when there are no exercises', () => {
    expect(getRoutineExerciseSummary(makeRoutine([]))).toBe('No exercises yet');
  });

  it('joins names when within the limit', () => {
    const routine = makeRoutine([
      makeExercise('Bench', 1),
      makeExercise('Row', 2),
    ]);

    expect(getRoutineExerciseSummary(routine, 2)).toBe('Bench, Row');
  });

  it('summarizes the remainder beyond the limit', () => {
    const routine = makeRoutine([
      makeExercise('Bench', 1),
      makeExercise('Row', 2),
      makeExercise('Squat', 3),
      makeExercise('Press', 4),
    ]);

    expect(getRoutineExerciseSummary(routine, 2)).toBe('Bench, Row +2 more');
  });
});
