import type { Routine } from '@workout/domain';
import { beforeEach, describe, expect, it } from 'vitest';

import {
  buildWorkoutSessionDraft,
  clearActiveWorkout,
  countWorkoutSets,
  getActiveWorkout,
  hasActiveWorkout,
  isActiveWorkoutForRoutine,
  setActiveWorkout,
  startActiveWorkout,
  toCreateWorkoutSessionInput,
  toggleWorkoutSetDone,
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
            { id: 's1', order: 1, reps: '8', weightKg: '60', done: false },
            { id: 's2', order: 2, reps: '', weightKg: '', done: false },
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

  it('stamps completedAt on sets marked done', () => {
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
          order: 1,
          entries: [
            { id: 's1', order: 1, reps: '8', weightKg: '60', done: true },
            { id: 's2', order: 2, reps: '6', weightKg: '65', done: false },
          ],
        },
      ],
    };

    const input = toCreateWorkoutSessionInput(draft);
    const sets = input.exercises[0]!.sets;

    expect(sets[0]!.completedAt).toBe(input.completedAt);
    expect(sets[1]!.completedAt).toBeUndefined();
  });
});

describe('active workout state', () => {
  const otherRoutine: Routine = { ...routine, id: 'routine-2', name: 'Pull Day' };

  beforeEach(() => {
    clearActiveWorkout();
  });

  it('starts and exposes an active workout for a routine', () => {
    const started = startActiveWorkout(routine);

    expect(hasActiveWorkout()).toBe(true);
    expect(getActiveWorkout()).toBe(started);
    expect(isActiveWorkoutForRoutine('routine-1')).toBe(true);
    expect(isActiveWorkoutForRoutine('routine-2')).toBe(false);
  });

  it('resumes the same routine without rebuilding', () => {
    const started = startActiveWorkout(routine);
    const edited: WorkoutSessionDraft = { ...started, routineName: 'Edited' };
    setActiveWorkout(edited);

    const resumed = startActiveWorkout(routine);

    expect(resumed).toBe(edited);
    expect(resumed.routineName).toBe('Edited');
  });

  it('replaces the active workout when starting a different routine', () => {
    startActiveWorkout(routine);
    const next = startActiveWorkout(otherRoutine);

    expect(next.routineId).toBe('routine-2');
    expect(isActiveWorkoutForRoutine('routine-2')).toBe(true);
  });

  it('clears the active workout', () => {
    startActiveWorkout(routine);
    clearActiveWorkout();

    expect(hasActiveWorkout()).toBe(false);
    expect(getActiveWorkout()).toBeNull();
  });
});

describe('set completion', () => {
  it('builds sets as not done and toggles a single set', () => {
    const draft = buildWorkoutSessionDraft(routine);
    const exercise = draft.exercises[0]!;
    const setId = exercise.entries[0]!.id;

    expect(exercise.entries[0]!.done).toBe(false);

    const toggled = toggleWorkoutSetDone(draft, exercise.id, setId);
    expect(toggled.exercises[0]!.entries[0]!.done).toBe(true);

    const back = toggleWorkoutSetDone(toggled, exercise.id, setId);
    expect(back.exercises[0]!.entries[0]!.done).toBe(false);
  });

  it('counts done vs total sets', () => {
    const draft = buildWorkoutSessionDraft(routine);
    const exercise = draft.exercises[0]!;
    const toggled = toggleWorkoutSetDone(draft, exercise.id, exercise.entries[0]!.id);

    expect(countWorkoutSets(draft)).toEqual({ done: 0, total: 2 });
    expect(countWorkoutSets(toggled)).toEqual({ done: 1, total: 2 });
  });
});
