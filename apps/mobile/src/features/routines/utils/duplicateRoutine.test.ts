import type { Routine } from '@workout/domain';
import { describe, expect, it } from 'vitest';

import { buildRoutineCopyInput } from './duplicateRoutine';

const at = '2026-10-17T08:00:00.000Z';

describe('buildRoutineCopyInput (spec 0024)', () => {
  it('copies warm-up sets and the warm-up block', () => {
    const routine: Routine = {
      id: 'r1',
      userId: 'u1',
      name: 'Legs',
      warmUpItems: [
        { order: 2, name: 'Band pull-aparts', targetReps: 15 },
        { order: 1, name: 'Bike', targetDurationSeconds: 300 },
      ],
      exercises: [
        {
          id: 're-1',
          routineId: 'r1',
          exerciseId: 'ex-squat',
          exerciseName: 'Squat',
          orderIndex: 1,
          sets: [
            { id: 's1', routineExerciseId: 're-1', setNumber: 1, targetWeight: 20, isWarmup: true, createdAt: at, updatedAt: at },
            { id: 's2', routineExerciseId: 're-1', setNumber: 2, targetWeight: 140, createdAt: at, updatedAt: at },
          ],
          createdAt: at,
          updatedAt: at,
        },
      ],
      createdAt: at,
      updatedAt: at,
    };

    const copy = buildRoutineCopyInput(routine);

    expect(copy.warmUpItems).toEqual([
      { name: 'Bike', targetDurationSeconds: 300, targetReps: undefined },
      { name: 'Band pull-aparts', targetDurationSeconds: undefined, targetReps: 15 },
    ]);
    expect(copy.exercises[0]!.sets.map((set) => set.isWarmup)).toEqual([true, undefined]);
  });
});
