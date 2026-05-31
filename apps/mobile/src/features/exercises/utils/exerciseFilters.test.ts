import { describe, expect, it } from 'vitest';

import { buildExerciseFacets, filterExercises } from './exerciseFilters';
import type { Exercise } from '@workout/domain';

function exercise(partial: Partial<Exercise> & { name: string }): Exercise {
  return {
    id: partial.name,
    isSystemDefined: true,
    createdAt: '',
    updatedAt: '',
    ...partial,
  };
}

const catalog = [
  exercise({ name: 'Bench Press', category: 'Chest', equipment: ['barbell'] }),
  exercise({ name: 'Push Up', category: 'Chest', equipment: ['none (bodyweight exercise)'] }),
  exercise({ name: 'Squat', category: 'Legs', equipment: ['barbell'] }),
  exercise({ name: 'Plank', category: 'Abs', equipment: [] }),
];

describe('buildExerciseFacets', () => {
  it('returns distinct sorted categories and equipment', () => {
    const facets = buildExerciseFacets(catalog);

    expect(facets.categories).toEqual(['Abs', 'Chest', 'Legs']);
    expect(facets.equipment).toEqual(['barbell', 'none (bodyweight exercise)']);
  });
});

describe('filterExercises', () => {
  it('filters by name query (case-insensitive)', () => {
    expect(
      filterExercises(catalog, { query: 'press' }).map((e) => e.name),
    ).toEqual(['Bench Press']);
  });

  it('filters by category', () => {
    expect(
      filterExercises(catalog, { query: '', category: 'Chest' }).map((e) => e.name),
    ).toEqual(['Bench Press', 'Push Up']);
  });

  it('filters by equipment', () => {
    expect(
      filterExercises(catalog, { query: '', equipment: 'barbell' }).map((e) => e.name),
    ).toEqual(['Bench Press', 'Squat']);
  });

  it('combines facets with the query (AND)', () => {
    // "Push Up" matches the query but its equipment is bodyweight, not barbell.
    expect(
      filterExercises(catalog, { query: 'push', equipment: 'barbell' }).map(
        (e) => e.name,
      ),
    ).toEqual([]);

    expect(
      filterExercises(catalog, { query: 'bench', equipment: 'barbell' }).map(
        (e) => e.name,
      ),
    ).toEqual(['Bench Press']);
  });
});
