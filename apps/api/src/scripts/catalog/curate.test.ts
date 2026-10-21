import { describe, expect, it } from 'vitest';

import { curatedFields, droppedCurated, isEmptyPlan, planCurate, type StoredCurated } from './curate.js';
import type { CatalogEntry } from './vocabulary.js';

const bench: CatalogEntry = {
  slug: 'barbell-bench-press',
  es: 'Press de banca',
  en: 'Bench press',
  aliases: ['banca'],
  category: 'Chest',
  primary: ['chest'],
  secondary: ['triceps', 'forearms'],
  equipment: ['Barbell', 'Bench'],
  loadingKind: 'barbell',
  trackingType: 'weight_reps',
  unilateral: false,
  image: 'Barbell_Bench_Press_-_Medium_Grip',
};

const stored = (entry: CatalogEntry, extra: Partial<StoredCurated> = {}): StoredCurated => ({
  ...curatedFields(entry),
  sourceId: entry.slug,
  deletedAt: null,
  ...extra,
});

const noUsage = { workoutExercises: [], routineExercises: [], favorites: [], curatedFavorites: [] };

const base = {
  catalog: [bench],
  muscles: ['chest', 'triceps'],
  curated: [] as StoredCurated[],
  old: [],
  usage: noUsage,
  carryOverMap: {},
};

describe('planCurate (spec 0044)', () => {
  it('creates new exercises and the muscle groups they need', () => {
    const plan = planCurate(base);
    expect(plan.creates).toEqual(['barbell-bench-press']);
    expect(plan.newMuscles).toEqual(['forearms']);
  });

  it('changes nothing the second time (FR-8)', () => {
    const plan = planCurate({ ...base, muscles: ['chest', 'triceps', 'forearms'], curated: [stored(bench)] });
    expect(isEmptyPlan(plan)).toBe(true);
    expect(plan.unchanged).toBe(1);
  });

  it('updates only the fields that differ, keeping what they were', () => {
    const plan = planCurate({
      ...base,
      muscles: ['chest', 'triceps', 'forearms'],
      curated: [stored(bench, { nameEn: 'Flat bench', trackingType: 'reps' })],
    });
    expect(plan.updates).toEqual([
      {
        slug: 'barbell-bench-press',
        before: { nameEn: 'Flat bench', trackingType: 'reps' },
        after: { nameEn: 'Bench press', trackingType: 'weight_reps' },
      },
    ]);
  });

  it('carries over workouts, routines and favourites, dropping a duplicate favourite', () => {
    const plan = planCurate({
      ...base,
      old: [
        {
          publicId: 'old-bench',
          name: 'Bench Press',
          source: 'custom',
          isSystemDefined: false,
          deletedAt: null,
          trackingType: 'reps',
          trackingTypeSetBy: 'person',
        },
      ],
      usage: {
        workoutExercises: [{ id: 'we1', exercisePublicId: 'old-bench' }],
        routineExercises: [{ id: 're1', exercisePublicId: 'old-bench', exerciseName: 'Bench Press' }],
        favorites: [
          { id: 'f1', userId: 'u1', exercisePublicId: 'old-bench' },
          { id: 'f2', userId: 'u2', exercisePublicId: 'old-bench' },
        ],
        curatedFavorites: [{ userId: 'u2', slug: 'barbell-bench-press' }],
      },
      carryOverMap: { 'old-bench': 'barbell-bench-press' },
    });

    expect(plan.carryOver).toEqual([
      {
        from: 'old-bench',
        fromName: 'Bench Press',
        to: 'barbell-bench-press',
        workoutExerciseIds: ['we1'],
        routineExercises: [{ id: 're1', exerciseName: 'Bench Press' }],
        favoritesMoved: ['f1'],
        favoritesDropped: [{ id: 'f2', userId: 'u2' }],
      },
    ]);
    // FR-7: a type set by hand that the reviewed exercise does not keep is listed.
    expect(plan.trackingTypeNotes).toHaveLength(1);
    // A merged custom exercise is retired; an unmerged one is left alone.
    expect(plan.retire).toEqual([{ publicId: 'old-bench', name: 'Bench Press', source: 'custom' }]);
  });

  it('retires every old catalog exercise, never an unmerged custom one', () => {
    const plan = planCurate({
      ...base,
      old: [
        { publicId: 'w1', name: 'Snach', source: 'wger', isSystemDefined: true, deletedAt: null, trackingType: 'weight_reps', trackingTypeSetBy: 'system' },
        { publicId: 'w2', name: 'Gone', source: 'wger', isSystemDefined: true, deletedAt: '2026-10-21T00:00:00.000Z', trackingType: 'weight_reps', trackingTypeSetBy: 'system' },
        { publicId: 'c1', name: 'Hola', source: 'custom', isSystemDefined: false, deletedAt: null, trackingType: 'weight_reps', trackingTypeSetBy: 'person' },
      ],
    });
    expect(plan.retire.map((row) => row.publicId)).toEqual(['w1']);
  });

  it('ignores map lines it cannot apply instead of guessing (EF-3)', () => {
    const plan = planCurate({ ...base, carryOverMap: { missing: 'barbell-bench-press', w1: 'nope' }, old: [
      { publicId: 'w1', name: 'X', source: 'wger', isSystemDefined: true, deletedAt: null, trackingType: 'weight_reps', trackingTypeSetBy: 'system' },
    ] });
    expect(plan.ignoredMap.map((line) => line.reason)).toEqual([
      'old exercise not in this database',
      'slug not in the reviewed catalog',
    ]);
  });

  it('finds reviewed exercises that left the catalog file', () => {
    expect(droppedCurated([bench], [stored(bench), stored({ ...bench, slug: 'old-one' })])).toEqual(['old-one']);
  });
});
