import { describe, expect, it } from 'vitest';

import type {
  WorkoutExerciseDraft,
  WorkoutSessionDraft,
  WorkoutSetDraft,
} from '@/features/workouts/state/workoutDraftStore';

import { countDoneSets, replaceExerciseInWorkout } from './replaceExercise';

function set(order: number, overrides: Partial<WorkoutSetDraft> = {}): WorkoutSetDraft {
  return {
    id: `s${order}`,
    order,
    reps: '',
    weightKg: '',
    repsPlaceholder: '10',
    weightPlaceholder: '100',
    done: false,
    type: 'normal',
    minReps: 8,
    maxReps: 10,
    targetWeight: 100,
    ...overrides,
  };
}

function exercise(
  id: string,
  order: number,
  entries: WorkoutSetDraft[],
  overrides: Partial<WorkoutExerciseDraft> = {},
): WorkoutExerciseDraft {
  return {
    id,
    exerciseId: `ex-${id}`,
    exerciseName: `Exercise ${id}`,
    routineExerciseId: `re-${id}`,
    order,
    entries,
    ...overrides,
  };
}

const hackSquat = { id: 'hack', name: 'Hack squat' };

function draft(exercises: WorkoutExerciseDraft[]): WorkoutSessionDraft {
  return {
    id: 'w1',
    clientId: 'c1',
    routineId: 'r1',
    routineName: 'Pierna A',
    startedAt: '2026-10-16T10:00:00.000Z',
    unit: 'kg',
    exercises,
  };
}

describe('replaceExerciseInWorkout', () => {
  const legPress = exercise(
    'b',
    2,
    [set(1, { type: 'warmup' }), set(2), set(3, { type: 'failure' })],
    { restSeconds: 120, supersetGroup: 1 },
  );
  const workout = draft([
    exercise('a', 1, [set(1)]),
    legPress,
    exercise('c', 3, [set(1)], { supersetGroup: 1 }),
  ]);

  it('puts the replacement in the same position with the same sets (AC-3)', () => {
    const next = replaceExerciseInWorkout(workout, 'b', hackSquat, 'drop');

    expect(next.exercises.map((item) => item.exerciseId)).toEqual([
      'ex-a',
      'hack',
      'ex-c',
    ]);
    const replacement = next.exercises[1]!;
    expect(replacement.exerciseName).toBe('Hack squat');
    expect(replacement.order).toBe(2);
    expect(replacement.entries.map((item) => item.type)).toEqual([
      'warmup',
      'normal',
      'failure',
    ]);
    expect(replacement.entries.map((item) => item.order)).toEqual([1, 2, 3]);
  });

  it('keeps rest and superset, drops the routine link (FR-5)', () => {
    const replacement = replaceExerciseInWorkout(workout, 'b', hackSquat, 'drop')
      .exercises[1]!;

    expect(replacement.restSeconds).toBe(120);
    expect(replacement.supersetGroup).toBe(1);
    expect(replacement.routineExerciseId).toBeUndefined();
    expect(replacement.id).not.toBe('b');
  });

  it('clears typed and ghosted values, keeping the rep range (FR-3)', () => {
    const typed = draft([
      exercise('b', 1, [set(1, { reps: '9', weightKg: '110', restSeconds: 90 })]),
    ]);
    const [newSet] = replaceExerciseInWorkout(typed, 'b', hackSquat, 'drop')
      .exercises[0]!.entries;

    expect(newSet).toMatchObject({
      reps: '',
      weightKg: '',
      done: false,
      repsPlaceholder: '10',
      minReps: 8,
      maxReps: 10,
    });
    expect(newSet!.weightPlaceholder).toBeUndefined();
    expect(newSet!.targetWeight).toBeUndefined();
    expect(newSet!.restSeconds).toBeUndefined();
  });

  it("'drop' discards the done sets and mirrors every set", () => {
    const started = draft([
      exercise('b', 1, [set(1, { done: true, reps: '10' }), set(2), set(3)]),
    ]);
    const next = replaceExerciseInWorkout(started, 'b', hackSquat, 'drop');

    expect(next.exercises).toHaveLength(1);
    expect(next.exercises[0]!.entries).toHaveLength(3);
    expect(next.exercises[0]!.entries.every((item) => !item.done)).toBe(true);
  });

  it("'keep' leaves the done sets in place and moves the rest to the replacement (EF-1)", () => {
    const started = draft([
      exercise('b', 1, [
        set(1, { done: true, reps: '10' }),
        set(2, { type: 'failure' }),
        set(3, { done: true, reps: '8' }),
      ]),
      exercise('c', 2, [set(1)]),
    ]);
    const next = replaceExerciseInWorkout(started, 'b', hackSquat, 'keep');

    expect(next.exercises.map((item) => [item.id === 'b', item.exerciseId, item.order])).toEqual([
      [true, 'ex-b', 1],
      [false, 'hack', 2],
      [false, 'ex-c', 3],
    ]);
    expect(next.exercises[0]!.entries.map((item) => [item.reps, item.order])).toEqual([
      ['10', 1],
      ['8', 2],
    ]);
    expect(next.exercises[0]!.routineExerciseId).toBe('re-b');
    expect(next.exercises[1]!.entries.map((item) => item.type)).toEqual(['failure']);
  });

  it("'keep' with every set done gives the replacement the same number again", () => {
    const finished = draft([
      exercise('b', 1, [set(1, { done: true }), set(2, { done: true })]),
    ]);
    const next = replaceExerciseInWorkout(finished, 'b', hackSquat, 'keep');

    expect(next.exercises).toHaveLength(2);
    expect(next.exercises[1]!.entries).toHaveLength(2);
  });

  it("'keep' with nothing done is a plain replace", () => {
    const next = replaceExerciseInWorkout(workout, 'b', hackSquat, 'keep');

    expect(next.exercises.map((item) => item.exerciseId)).toEqual([
      'ex-a',
      'hack',
      'ex-c',
    ]);
  });

  it('gives every new set an id of its own', () => {
    const finished = draft([exercise('b', 1, [set(1, { done: true })])]);
    const next = replaceExerciseInWorkout(finished, 'b', hackSquat, 'keep');
    const ids = next.exercises.flatMap((item) => item.entries.map((entry) => entry.id));

    expect(new Set(ids).size).toBe(ids.length);
  });

  it('returns the same draft for an unknown exercise', () => {
    expect(replaceExerciseInWorkout(workout, 'nope', hackSquat, 'drop')).toBe(workout);
  });
});

describe('countDoneSets', () => {
  it('counts the sets marked done', () => {
    expect(
      countDoneSets(exercise('b', 1, [set(1, { done: true }), set(2), set(3, { done: true })])),
    ).toBe(2);
  });
});
