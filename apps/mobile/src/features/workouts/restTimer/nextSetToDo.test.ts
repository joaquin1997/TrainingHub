import { describe, expect, it } from 'vitest';

import type {
  WorkoutExerciseDraft,
  WorkoutSessionDraft,
} from '@/features/workouts/state/workoutDraftStore';

import { currentSetToDo, nextSetToDo } from './nextSetToDo';

const exercise = (
  id: string,
  done: boolean[],
  supersetGroup?: number,
): WorkoutExerciseDraft => ({
  id,
  exerciseId: `ex-${id}`,
  exerciseName: id,
  supersetGroup,
  order: 0,
  entries: done.map((isDone, i) => ({
    id: `${id}${i + 1}`,
    order: i + 1,
    reps: '',
    weightKg: '',
    done: isDone,
    type: 'normal',
  })),
});

const workout = (...exercises: WorkoutExerciseDraft[]): WorkoutSessionDraft => ({
  id: 'w',
  clientId: 'c',
  routineId: 'r',
  routineName: 'R',
  startedAt: '2026-10-16T09:00:00.000Z',
  exercises,
});

describe('nextSetToDo (spec 0018 FR-5)', () => {
  it('is the next set of the same exercise', () => {
    const draft = workout(exercise('A', [true, false, false]), exercise('B', [false]));

    expect(nextSetToDo(draft, 'A')).toEqual({ workoutExerciseId: 'A', workoutSetId: 'A2' });
  });

  it('alternates inside a superset: A1 → B1 → A2', () => {
    const afterA1 = workout(exercise('A', [true, false], 1), exercise('B', [false, false], 1));
    const afterB1 = workout(exercise('A', [true, false], 1), exercise('B', [true, false], 1));

    expect(nextSetToDo(afterA1, 'A')).toEqual({ workoutExerciseId: 'B', workoutSetId: 'B1' });
    expect(nextSetToDo(afterB1, 'B')).toEqual({ workoutExerciseId: 'A', workoutSetId: 'A2' });
  });

  it('moves on after a finished block, then back to one left before it', () => {
    const draft = workout(
      exercise('A', [false]),
      exercise('B', [true, true], 2),
      exercise('C', [true], 2),
      exercise('D', [true, false]),
    );

    expect(nextSetToDo(draft, 'C')).toEqual({ workoutExerciseId: 'D', workoutSetId: 'D2' });

    const lastDone = workout(exercise('A', [false]), exercise('B', [true]));
    expect(nextSetToDo(lastDone, 'B')).toEqual({ workoutExerciseId: 'A', workoutSetId: 'A1' });
  });

  it('is none when every set is done', () => {
    const draft = workout(exercise('A', [true]), exercise('B', [true, true]));

    expect(nextSetToDo(draft, 'A')).toBeNull();
  });

  it('looks everywhere when the exercise is gone', () => {
    const draft = workout(exercise('A', [true]), exercise('B', [false]));

    expect(nextSetToDo(draft, 'gone')).toEqual({ workoutExerciseId: 'B', workoutSetId: 'B1' });
  });
});

describe('nextSetToDo in round order (spec 0029 FR-7, FR-9)', () => {
  const withWarmUps = (base: WorkoutExerciseDraft, warmUps: boolean[]): WorkoutExerciseDraft => ({
    ...base,
    entries: [
      ...warmUps.map((isDone, i) => ({
        id: `${base.id}w${i + 1}`,
        order: i + 1,
        reps: '',
        weightKg: '',
        done: isDone,
        type: 'warmup' as const,
      })),
      ...base.entries.map((set) => ({ ...set, order: set.order + warmUps.length })),
    ],
  });

  it('does warm-ups first, exercise by exercise, then round 1 (AC-11)', () => {
    const a = withWarmUps(exercise('A', [false, false], 1), [true, false]);
    const b = withWarmUps(exercise('B', [false, false], 1), [false]);

    expect(nextSetToDo(workout(a, b), 'A')).toEqual({ workoutExerciseId: 'A', workoutSetId: 'Aw2' });

    const warmedUp = workout(
      withWarmUps(exercise('A', [false, false], 1), [true, true]),
      withWarmUps(exercise('B', [false, false], 1), [true]),
    );
    expect(nextSetToDo(warmedUp, 'B')).toEqual({ workoutExerciseId: 'A', workoutSetId: 'A1' });
  });

  it('pairs sets by working position, not by order with warm-ups', () => {
    const draft = workout(
      withWarmUps(exercise('A', [true, false], 1), [true, true]),
      exercise('B', [false, false], 1),
    );

    expect(nextSetToDo(draft, 'A')).toEqual({ workoutExerciseId: 'B', workoutSetId: 'B1' });
  });

  it('goes back to the lowest unfinished round after out-of-order ticks (EF-2)', () => {
    const draft = workout(exercise('A', [false, false], 1), exercise('B', [false, true], 1));

    expect(nextSetToDo(draft, 'B')).toEqual({ workoutExerciseId: 'A', workoutSetId: 'A1' });
  });

  it('lets the longer exercise finish alone (uneven pair)', () => {
    const draft = workout(exercise('A', [true, true, false], 1), exercise('B', [true, true], 1));

    expect(nextSetToDo(draft, 'B')).toEqual({ workoutExerciseId: 'A', workoutSetId: 'A3' });
  });

  it('goes through a tri-set A → B → C', () => {
    const draft = workout(
      exercise('A', [true, false], 1),
      exercise('B', [true, false], 1),
      exercise('C', [false, false], 1),
    );

    expect(nextSetToDo(draft, 'B')).toEqual({ workoutExerciseId: 'C', workoutSetId: 'C1' });
  });
});

describe('currentSetToDo (spec 0029 FR-10, FR-11)', () => {
  it('follows the last ticked exercise, even past an earlier unfinished one', () => {
    const draft = {
      ...workout(
        exercise('X', [false]),
        exercise('A', [true, false], 1),
        exercise('B', [false, false], 1),
      ),
      lastTickedExerciseId: 'A',
    };

    expect(currentSetToDo(draft)).toEqual({ workoutExerciseId: 'B', workoutSetId: 'B1' });
  });

  it('falls back to the rest, then to the first set left (older drafts)', () => {
    const resting = {
      ...workout(exercise('X', [false]), exercise('A', [true, false])),
      rest: { endsAt: '2026-10-16T09:02:00.000Z', totalSeconds: 60, workoutExerciseId: 'A' },
    };
    expect(currentSetToDo(resting)).toEqual({ workoutExerciseId: 'A', workoutSetId: 'A2' });

    expect(currentSetToDo(workout(exercise('X', [true]), exercise('A', [false])))).toEqual({
      workoutExerciseId: 'A',
      workoutSetId: 'A1',
    });
  });

  it('is none when every set is done', () => {
    expect(currentSetToDo(workout(exercise('A', [true])))).toBeNull();
  });
});
