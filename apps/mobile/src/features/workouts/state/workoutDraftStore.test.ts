import type { Routine } from '@workout/domain';
import { describe, expect, it } from 'vitest';

import {
  buildWorkoutSessionDraft,
  toCreateWorkoutSessionInput,
  type WorkoutSessionDraft,
} from './workoutDraftStore';

const routine: Routine = {
  id: 'routine-1',
  userId: 'u1',
  name: 'Push Day',
  exercises: [
    {
      id: 're-row',
      routineId: 'routine-1',
      exerciseId: 'ex-row',
      exerciseName: 'Row',
      orderIndex: 2,
      sets: [
        {
          id: 's-row-1',
          routineExerciseId: 're-row',
          setNumber: 1,
          targetWeight: 50,
          createdAt: '',
          updatedAt: '',
        },
      ],
      createdAt: '',
      updatedAt: '',
    },
    {
      id: 're-bench',
      routineId: 'routine-1',
      exerciseId: 'ex-bench',
      exerciseName: 'Bench',
      orderIndex: 1,
      sets: [
        {
          id: 's-bench-1',
          routineExerciseId: 're-bench',
          setNumber: 1,
          createdAt: '',
          updatedAt: '',
        },
      ],
      createdAt: '',
      updatedAt: '',
    },
  ],
  createdAt: '',
  updatedAt: '',
};

describe('buildWorkoutSessionDraft', () => {
  it('orders exercises by orderIndex and carries names + ids', () => {
    const draft = buildWorkoutSessionDraft(routine);

    expect(draft.routineId).toBe('routine-1');
    expect(draft.routineName).toBe('Push Day');
    expect(draft.exercises.map((exercise) => exercise.exerciseName)).toEqual([
      'Bench',
      'Row',
    ]);
    expect(draft.exercises[1]?.routineExerciseId).toBe('re-row');
  });

  it('prefills weight from the target and leaves reps empty', () => {
    const draft = buildWorkoutSessionDraft(routine);
    const rowSet = draft.exercises[1]?.entries[0];

    expect(rowSet?.weightKg).toBe('50');
    expect(rowSet?.reps).toBe('');
  });
});

describe('toCreateWorkoutSessionInput', () => {
  it('coerces logged strings to numbers and drops empties', () => {
    const draft: WorkoutSessionDraft = {
      id: 'w1',
      routineId: 'routine-1',
      routineName: 'Push Day',
      startedAt: '2026-05-30T09:00:00.000Z',
      exercises: [
        {
          id: 'we-1',
          exerciseId: 'ex-bench',
          exerciseName: 'Bench',
          routineExerciseId: 're-bench',
          order: 1,
          entries: [
            { id: 's1', order: 1, reps: '8', weightKg: '60' },
            { id: 's2', order: 2, reps: '', weightKg: '' },
          ],
        },
      ],
    };

    const input = toCreateWorkoutSessionInput(draft);

    expect(input.routineId).toBe('routine-1');
    expect(input.startedAt).toBe('2026-05-30T09:00:00.000Z');
    expect(typeof input.completedAt).toBe('string');
    expect(input.exercises[0]?.sets).toEqual([
      { order: 1, reps: 8, weightKg: 60 },
      { order: 2, reps: undefined, weightKg: undefined },
    ]);
  });
});
