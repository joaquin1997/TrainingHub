import type { CreateWorkoutSessionInput } from '@workout/domain';
import { describe, expect, it } from 'vitest';

import {
  dropForeignLinks,
  findUnknownExercise,
  referencedIds,
} from './saveReferences.js';

const input: CreateWorkoutSessionInput = {
  clientId: 'c1',
  routineId: 'r-mine',
  startedAt: '2026-10-16T09:00:00.000Z',
  exercises: [
    { exerciseId: 'ex-bench', routineExerciseId: 're-mine', order: 1, sets: [] },
    { exerciseId: 'ex-row', routineExerciseId: 're-other', order: 2, sets: [] },
    { exerciseId: 'ex-bench', order: 3, sets: [] },
  ],
};

describe('referencedIds', () => {
  it('collects every referenced id once', () => {
    expect(referencedIds(input)).toEqual({
      routineId: 'r-mine',
      routineExerciseIds: ['re-mine', 're-other'],
      exerciseIds: ['ex-bench', 'ex-row'],
    });
  });
});

describe('dropForeignLinks', () => {
  it('keeps links to the user own routine and slots', () => {
    const kept = dropForeignLinks(input, {
      routineIds: new Set(['r-mine']),
      routineExerciseIds: new Set(['re-mine', 're-other']),
    });

    expect(kept.routineId).toBe('r-mine');
    expect(kept.exercises.map((exercise) => exercise.routineExerciseId)).toEqual([
      're-mine',
      're-other',
      undefined,
    ]);
  });

  it('drops links to a routine or slot that is missing or someone else', () => {
    const kept = dropForeignLinks(input, {
      routineIds: new Set(),
      routineExerciseIds: new Set(['re-mine']),
    });

    expect(kept.routineId).toBeUndefined();
    expect(kept.exercises.map((exercise) => exercise.routineExerciseId)).toEqual([
      're-mine',
      undefined,
      undefined,
    ]);
  });

  it('keeps everything else, including the exercises and the identity', () => {
    const kept = dropForeignLinks(input, {
      routineIds: new Set(),
      routineExerciseIds: new Set(),
    });

    expect(kept.clientId).toBe('c1');
    expect(kept.exercises.map((exercise) => exercise.exerciseId)).toEqual([
      'ex-bench',
      'ex-row',
      'ex-bench',
    ]);
  });
});

describe('findUnknownExercise', () => {
  it('returns undefined when every exercise exists', () => {
    expect(findUnknownExercise(input, new Set(['ex-bench', 'ex-row']))).toBeUndefined();
  });

  it('returns the first unknown exercise', () => {
    expect(findUnknownExercise(input, new Set(['ex-bench']))).toBe('ex-row');
  });
});
