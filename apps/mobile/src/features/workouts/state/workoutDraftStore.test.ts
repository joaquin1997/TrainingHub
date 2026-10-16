import type { Routine } from '@workout/domain';
import { beforeEach, describe, expect, it } from 'vitest';

import {
  addExerciseToWorkout,
  addSetToWorkoutExercise,
  applyLastPerformance,
  buildWorkoutSessionDraft,
  cycleWorkoutSetType,
  removeExerciseFromWorkout,
  clearActiveWorkout,
  countWorkoutSets,
  moveWorkoutExercise,
  moveWorkoutSet,
  removeSetFromWorkoutExercise,
  getActiveWorkout,
  hasActiveWorkout,
  isActiveWorkoutForRoutine,
  setActiveWorkout,
  startActiveWorkout,
  toCreateWorkoutSessionInput,
  toWorkoutSessionSkeleton,
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

  it('leaves actual fields empty and ghosts the target weight as a placeholder', () => {
    const draft = buildWorkoutSessionDraft(routine);
    const rowSet = draft.exercises[1]?.entries[0];

    expect(rowSet?.weightKg).toBe('');
    expect(rowSet?.reps).toBe('');
    expect(rowSet?.weightPlaceholder).toBe('50');
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
            { id: 's1', order: 1, reps: '8', weightKg: '60', done: false, type: 'normal' },
            { id: 's2', order: 2, reps: '', weightKg: '', done: false, type: 'normal' },
          ],
        },
      ],
    };

    const input = toCreateWorkoutSessionInput(draft);

    expect(input.routineId).toBe('routine-1');
    expect(input.startedAt).toBe('2026-05-30T09:00:00.000Z');
    expect(typeof input.completedAt).toBe('string');
    expect(input.exercises[0]?.sets).toEqual([
      { order: 1, reps: 8, weightKg: 60, type: 'normal' },
      { order: 2, reps: undefined, weightKg: undefined, type: 'normal' },
    ]);
  });

  it('logs the ghosted placeholder when the actual field is left empty', () => {
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
            {
              id: 's1',
              order: 1,
              reps: '',
              weightKg: '',
              repsPlaceholder: '10',
              weightPlaceholder: '50',
              done: true,
              type: 'normal',
            },
            {
              id: 's2',
              order: 2,
              reps: '8',
              weightKg: '',
              repsPlaceholder: '10',
              weightPlaceholder: '60',
              done: true,
              type: 'normal',
            },
          ],
        },
      ],
    };

    const sets = toCreateWorkoutSessionInput(draft).exercises[0]!.sets;

    // s1: both empty -> falls back to placeholders.
    expect(sets[0]).toMatchObject({ reps: 10, weightKg: 50 });
    // s2: reps edited, weight empty -> edited reps + placeholder weight.
    expect(sets[1]).toMatchObject({ reps: 8, weightKg: 60 });
  });

  it('converts lb input back to canonical kg on persist', () => {
    const draft: WorkoutSessionDraft = {
      id: 'w1',
      routineId: 'routine-1',
      routineName: 'Push Day',
      startedAt: '2026-05-30T09:00:00.000Z',
      unit: 'lb',
      exercises: [
        {
          id: 'we-1',
          exerciseId: 'ex-bench',
          exerciseName: 'Bench',
          order: 1,
          entries: [
            { id: 's1', order: 1, reps: '8', weightKg: '220.5', done: true, type: 'normal' },
          ],
        },
      ],
    };

    const set = toCreateWorkoutSessionInput(draft).exercises[0]!.sets[0]!;
    // 220.5 lb -> 100 kg.
    expect(set.weightKg).toBe(100);
  });

  it('ghosts the routine target weight in the session unit', () => {
    const draft = buildWorkoutSessionDraft(routine, 'lb'); // Row target 50 kg
    const rowSet = draft.exercises[1]?.entries[0];

    // 50 kg -> 110.2 lb shown as the placeholder.
    expect(rowSet?.weightPlaceholder).toBe('110.2');
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
            { id: 's1', order: 1, reps: '8', weightKg: '60', done: true, type: 'normal' },
            { id: 's2', order: 2, reps: '6', weightKg: '65', done: false, type: 'normal' },
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

describe('add / remove sets', () => {
  it('appends an empty set, ghosting the previous set values as placeholders', () => {
    const draft = buildWorkoutSessionDraft(routine);
    const exerciseId = draft.exercises[1]!.id; // Row, has a set with target 50

    const next = addSetToWorkoutExercise(draft, exerciseId);
    const entries = next.exercises[1]!.entries;

    expect(entries).toHaveLength(2);
    expect(entries[1]!.order).toBe(2);
    expect(entries[1]!.reps).toBe('');
    expect(entries[1]!.weightKg).toBe('');
    expect(entries[1]!.weightPlaceholder).toBe('50');
    expect(entries[1]!.done).toBe(false);
  });

  it('removes a set and renumbers the rest', () => {
    const draft = buildWorkoutSessionDraft(routine);
    const exerciseId = draft.exercises[1]!.id;
    const withTwo = addSetToWorkoutExercise(draft, exerciseId);
    const firstSetId = withTwo.exercises[1]!.entries[0]!.id;

    const next = removeSetFromWorkoutExercise(withTwo, exerciseId, firstSetId);
    const entries = next.exercises[1]!.entries;

    expect(entries).toHaveLength(1);
    expect(entries[0]!.order).toBe(1);
  });
});

describe('applyLastPerformance', () => {
  it('ghosts last-performance values as placeholders without touching actuals', () => {
    const draft = buildWorkoutSessionDraft(routine);
    const rowExerciseId = 'ex-row'; // Row, one set at order 1

    const next = applyLastPerformance(draft, rowExerciseId, {
      performedAt: '2026-05-29T09:00:00.000Z',
      sets: [{ order: 1, reps: 12, weightKg: 55 }],
    });

    const rowSet = next.exercises.find((e) => e.exerciseId === rowExerciseId)!
      .entries[0]!;
    expect(rowSet.repsPlaceholder).toBe('12');
    expect(rowSet.weightPlaceholder).toBe('55');
    // Actual entry fields stay empty.
    expect(rowSet.reps).toBe('');
    expect(rowSet.weightKg).toBe('');
  });

  it('returns the same reference when nothing changes', () => {
    const draft = buildWorkoutSessionDraft(routine);

    const unchanged = applyLastPerformance(draft, 'ex-row', {
      performedAt: '2026-05-29T09:00:00.000Z',
      sets: [{ order: 99, reps: 5, weightKg: 5 }], // no matching set order
    });

    expect(unchanged).toBe(draft);
  });
});

describe('reorder', () => {
  it('moves an exercise down and renumbers order', () => {
    const draft = buildWorkoutSessionDraft(routine); // [Bench, Row]
    const benchId = draft.exercises[0]!.id;

    const next = moveWorkoutExercise(draft, benchId, 'down');

    expect(next.exercises.map((e) => e.exerciseName)).toEqual(['Row', 'Bench']);
    expect(next.exercises.map((e) => e.order)).toEqual([1, 2]);
  });

  it('is a no-op when moving the first exercise up', () => {
    const draft = buildWorkoutSessionDraft(routine);
    const benchId = draft.exercises[0]!.id;

    const next = moveWorkoutExercise(draft, benchId, 'up');

    expect(next.exercises.map((e) => e.exerciseName)).toEqual(['Bench', 'Row']);
  });

  it('moves a set within an exercise', () => {
    const draft = buildWorkoutSessionDraft(routine);
    const exerciseId = draft.exercises[1]!.id;
    const withTwo = addSetToWorkoutExercise(draft, exerciseId);
    const secondSetId = withTwo.exercises[1]!.entries[1]!.id;

    const next = moveWorkoutSet(withTwo, exerciseId, secondSetId, 'up');
    const entries = next.exercises[1]!.entries;

    expect(entries[0]!.id).toBe(secondSetId);
    expect(entries.map((s) => s.order)).toEqual([1, 2]);
  });
});

describe('add / remove exercises', () => {
  it('appends an exercise with one empty set and order at the end', () => {
    const draft = buildWorkoutSessionDraft(routine); // 2 exercises

    const next = addExerciseToWorkout(draft, { id: 'ex-squat', name: 'Squat' });

    expect(next.exercises).toHaveLength(3);
    const added = next.exercises[2]!;
    expect(added.exerciseName).toBe('Squat');
    expect(added.exerciseId).toBe('ex-squat');
    expect(added.order).toBe(3);
    expect(added.entries).toHaveLength(1);
    expect(added.entries[0]!.reps).toBe('');
  });

  it('removes an exercise and renumbers order', () => {
    const draft = buildWorkoutSessionDraft(routine);
    const firstId = draft.exercises[0]!.id;

    const next = removeExerciseFromWorkout(draft, firstId);

    expect(next.exercises).toHaveLength(1);
    expect(next.exercises[0]!.order).toBe(1);
  });
});

describe('set type', () => {
  it('builds sets as normal and cycles type', () => {
    const draft = buildWorkoutSessionDraft(routine);
    const exercise = draft.exercises[0]!;
    const setId = exercise.entries[0]!.id;

    expect(exercise.entries[0]!.type).toBe('normal');

    const warmup = cycleWorkoutSetType(draft, exercise.id, setId);
    expect(warmup.exercises[0]!.entries[0]!.type).toBe('warmup');

    const drop = cycleWorkoutSetType(warmup, exercise.id, setId);
    expect(drop.exercises[0]!.entries[0]!.type).toBe('drop');
  });
});

describe('toWorkoutSessionSkeleton', () => {
  const draftWith = (unit: 'kg' | 'lb'): WorkoutSessionDraft => ({
    id: 'w1',
    routineId: 'routine-1',
    routineName: 'Push Day',
    startedAt: '2026-05-30T09:00:00.000Z',
    unit,
    exercises: [
      {
        id: 'we-1',
        exerciseId: 'ex-bench',
        exerciseName: 'Bench',
        routineExerciseId: 're-bench',
        order: 1,
        entries: [
          {
            id: 's1',
            order: 1,
            reps: '',
            weightKg: '',
            repsPlaceholder: '8',
            weightPlaceholder: '100',
            done: true,
            type: 'normal',
          },
          { id: 's2', order: 2, reps: '', weightKg: '', done: false, type: 'normal' },
        ],
      },
    ],
  });

  it('carries the values that get saved, placeholders included (spec 0013 FR-6)', () => {
    const sets = toWorkoutSessionSkeleton(draftWith('kg')).exercises[0]?.sets;

    expect(sets?.map((set) => [set.reps, set.weightKg])).toEqual([
      [8, 100],
      [undefined, undefined],
    ]);
  });

  it('converts a placeholder typed in lb to canonical kg', () => {
    const set = toWorkoutSessionSkeleton(draftWith('lb')).exercises[0]?.sets[0];

    expect(set?.weightKg).toBeCloseTo(45.36, 1);
  });
});
