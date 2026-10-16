import { describe, expect, it } from 'vitest';

import type {
  WorkoutExerciseDraft,
  WorkoutSessionDraft,
} from '@/features/workouts/state/workoutDraftStore';

import { nextSetToDo } from './nextSetToDo';

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
