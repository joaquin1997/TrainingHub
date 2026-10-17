import { describe, expect, it } from 'vitest';

import { describeDeletionImpact, isInActiveWorkout } from './exerciseDeletion';

const keys = (lines: ReturnType<typeof describeDeletionImpact>) => lines.map((line) => line.key);

describe('describeDeletionImpact (spec 0033 FR-3, FR-4)', () => {
  it('says a never-used exercise is used nowhere (AC-1)', () => {
    expect(describeDeletionImpact({ routineCount: 0, workoutCount: 0 }, false)).toEqual([
      { key: 'exerciseDeletion.unused' },
      { key: 'exerciseDeletion.disappears' },
    ]);
  });

  it('names the routines and workouts with their counts (AC-2)', () => {
    expect(describeDeletionImpact({ routineCount: 1, workoutCount: 30 }, false)).toEqual([
      { key: 'exerciseDeletion.inRoutines', count: 1 },
      { key: 'exerciseDeletion.inWorkouts', count: 30 },
      { key: 'exerciseDeletion.disappears' },
    ]);
  });

  it('leaves out what is zero', () => {
    expect(keys(describeDeletionImpact({ routineCount: 0, workoutCount: 4 }, false))).toEqual([
      'exerciseDeletion.inWorkouts',
      'exerciseDeletion.disappears',
    ]);
    expect(keys(describeDeletionImpact({ routineCount: 2, workoutCount: 0 }, false))).toEqual([
      'exerciseDeletion.inRoutines',
      'exerciseDeletion.disappears',
    ]);
  });

  it('mentions the active workout (AC-5), and then never says "used nowhere"', () => {
    expect(keys(describeDeletionImpact({ routineCount: 0, workoutCount: 0 }, true))).toEqual([
      'exerciseDeletion.inActiveWorkout',
      'exerciseDeletion.disappears',
    ]);
    expect(keys(describeDeletionImpact({ routineCount: 1, workoutCount: 3 }, true))).toEqual([
      'exerciseDeletion.inRoutines',
      'exerciseDeletion.inWorkouts',
      'exerciseDeletion.inActiveWorkout',
      'exerciseDeletion.disappears',
    ]);
  });
});

describe('isInActiveWorkout', () => {
  it('looks for the exercise in the active workout', () => {
    const workout = { exercises: [{ exerciseId: 'a' }, { exerciseId: 'b' }] };
    expect(isInActiveWorkout(workout, 'b')).toBe(true);
    expect(isInActiveWorkout(workout, 'c')).toBe(false);
  });

  it('is false without an active workout', () => {
    expect(isInActiveWorkout(null, 'a')).toBe(false);
    expect(isInActiveWorkout(undefined, 'a')).toBe(false);
  });
});
