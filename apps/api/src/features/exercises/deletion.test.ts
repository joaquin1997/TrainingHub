import { describe, expect, it } from 'vitest';

import {
  deletionImpactWhere,
  parseInActiveWorkoutFlag,
  planExerciseDeletion,
} from './deletion.js';

const base = {
  access: 'own' as const,
  isDeleted: false,
  isReferenced: false,
  inActiveWorkout: false,
};

describe('planExerciseDeletion (spec 0033)', () => {
  it('removes a never-used custom exercise outright (AC-1)', () => {
    expect(planExerciseDeletion(base)).toBe('remove');
  });

  it('archives one that routines or saved workouts contain (FR-6, FR-7)', () => {
    expect(planExerciseDeletion({ ...base, isReferenced: true })).toBe('archive');
  });

  it('archives one only the active workout contains, so that workout still saves (FR-8)', () => {
    expect(planExerciseDeletion({ ...base, inActiveWorkout: true })).toBe('archive');
  });

  it('treats an exercise already deleted as done (EF-2)', () => {
    expect(planExerciseDeletion({ ...base, isDeleted: true })).toBe('already-deleted');
    expect(
      planExerciseDeletion({ ...base, isDeleted: true, isReferenced: true }),
    ).toBe('already-deleted');
  });

  it('refuses catalog exercises (FR-2)', () => {
    expect(planExerciseDeletion({ ...base, access: 'catalog' })).toBe('forbidden');
  });

  it('answers someone else exactly as for an unknown exercise (FR-2, EF-3)', () => {
    expect(planExerciseDeletion({ ...base, access: 'hidden' })).toBe('not-found');
    expect(planExerciseDeletion({ ...base, access: 'missing' })).toBe('not-found');
    // Even a deleted one: whether it was deleted is the creator's business.
    expect(
      planExerciseDeletion({ ...base, access: 'hidden', isDeleted: true }),
    ).toBe('not-found');
  });
});

describe('deletionImpactWhere (spec 0033 FR-3)', () => {
  it('counts only the person own routines and workouts containing the exercise', () => {
    expect(deletionImpactWhere('user-ana', 42n)).toEqual({
      routines: { user: { publicId: 'user-ana' }, exercises: { some: { exerciseId: 42n } } },
      workouts: { user: { publicId: 'user-ana' }, exercises: { some: { exerciseId: 42n } } },
    });
  });

  it('never refers to another person', () => {
    const where = deletionImpactWhere('user-ana', 42n);
    const text = JSON.stringify(where, (_key, value) =>
      typeof value === 'bigint' ? value.toString() : value,
    );
    expect(text).not.toMatch(/user-ben/);
    expect(where.routines.user).toEqual({ publicId: 'user-ana' });
    expect(where.workouts.user).toEqual({ publicId: 'user-ana' });
  });
});

describe('parseInActiveWorkoutFlag', () => {
  it('is set only by an explicit true', () => {
    expect(parseInActiveWorkoutFlag('true')).toBe(true);
    expect(parseInActiveWorkoutFlag('1')).toBe(true);
    expect(parseInActiveWorkoutFlag(undefined)).toBe(false);
    expect(parseInActiveWorkoutFlag('false')).toBe(false);
    expect(parseInActiveWorkoutFlag('yes')).toBe(false);
  });
});
