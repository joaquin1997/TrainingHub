import { describe, expect, it } from 'vitest';

import {
  classifyExerciseAccess,
  usableExerciseWhere,
  visibleExerciseWhere,
} from './visibility.js';

describe('visibleExerciseWhere', () => {
  it('is the catalog or the person own custom exercises', () => {
    expect(visibleExerciseWhere('user-ana')).toEqual({
      OR: [
        { isSystemDefined: true },
        { isSystemDefined: false, createdByUser: { publicId: 'user-ana' } },
      ],
    });
  });

  it('never matches custom exercises without a creator (EF-3)', () => {
    const own = visibleExerciseWhere('user-ana').OR?.[1];
    // The custom branch requires a creator with this public id; a null
    // creator (deleted account) cannot satisfy it.
    expect(own).toMatchObject({ createdByUser: { publicId: 'user-ana' } });
  });
});

describe('usableExerciseWhere', () => {
  it('adds held exercises, scoped to the person routines and workouts', () => {
    const where = usableExerciseWhere('user-ben');

    expect(where.OR).toEqual([
      { isSystemDefined: true },
      { isSystemDefined: false, createdByUser: { publicId: 'user-ben' } },
      { routineExercises: { some: { routine: { user: { publicId: 'user-ben' } } } } },
      {
        workoutExercises: {
          some: { workoutSession: { user: { publicId: 'user-ben' } } },
        },
      },
    ]);
  });

  it('never refers to another person', () => {
    expect(JSON.stringify(usableExerciseWhere('user-ben'))).not.toMatch(/user-ana/);
  });
});

describe('classifyExerciseAccess', () => {
  it('treats catalog exercises as catalog for everyone', () => {
    expect(classifyExerciseAccess({ isSystemDefined: true }, 'user-ben')).toBe('catalog');
    expect(
      classifyExerciseAccess({ isSystemDefined: true, creatorPublicId: 'user-ana' }, 'user-ben'),
    ).toBe('catalog');
  });

  it('gives the creator their own exercise', () => {
    expect(
      classifyExerciseAccess({ isSystemDefined: false, creatorPublicId: 'user-ana' }, 'user-ana'),
    ).toBe('own');
  });

  it('hides someone else custom exercise (FR-2)', () => {
    expect(
      classifyExerciseAccess({ isSystemDefined: false, creatorPublicId: 'user-ana' }, 'user-ben'),
    ).toBe('hidden');
  });

  it('hides a custom exercise whose creator is gone (EF-3)', () => {
    expect(
      classifyExerciseAccess({ isSystemDefined: false, creatorPublicId: null }, 'user-ben'),
    ).toBe('hidden');
    expect(classifyExerciseAccess({ isSystemDefined: false }, '')).toBe('hidden');
  });
});
