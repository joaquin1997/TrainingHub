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
        {
          isSystemDefined: false,
          createdByUser: { publicId: 'user-ana' },
          deletedAt: null,
        },
      ],
    });
  });

  it('leaves out custom exercises their creator deleted (spec 0033 FR-5, FR-11)', () => {
    const [catalog, own] = visibleExerciseWhere('user-ana').OR ?? [];
    expect(own).toMatchObject({ deletedAt: null });
    // Catalog exercises are never deleted: no lifecycle filter on them.
    expect(catalog).toEqual({ isSystemDefined: true });
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

  it('keeps the person own custom exercises even once deleted (spec 0033 FR-7, FR-8, EF-5)', () => {
    const own = usableExerciseWhere('user-ben').OR?.[1];
    expect(own).toEqual({ isSystemDefined: false, createdByUser: { publicId: 'user-ben' } });
    expect(JSON.stringify(usableExerciseWhere('user-ben'))).not.toMatch(/deletedAt/);
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

  it('hides a deleted custom exercise from everyone, its creator included (spec 0033)', () => {
    const deleted = { isSystemDefined: false, creatorPublicId: 'user-ana', isDeleted: true };
    expect(classifyExerciseAccess(deleted, 'user-ana')).toBe('hidden');
    expect(classifyExerciseAccess(deleted, 'user-ben')).toBe('hidden');
    expect(
      classifyExerciseAccess({ ...deleted, isDeleted: false }, 'user-ana'),
    ).toBe('own');
  });

  it('ignores the lifecycle when the caller does not pass it', () => {
    expect(
      classifyExerciseAccess({ isSystemDefined: false, creatorPublicId: 'user-ana' }, 'user-ana'),
    ).toBe('own');
  });
});
