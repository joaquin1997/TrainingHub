import { describe, expect, it } from 'vitest';

import { buildExerciseFacets, filterExercises, searchExercises } from './exerciseFilters';
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

describe('searchExercises (spec 0044 FR-3, FR-10)', () => {
  const reviewed = [
    exercise({ name: 'Press inclinado con barra', aliases: ['Incline bench press', 'press banca inclinado'] }),
    exercise({ name: 'Press de banca', aliases: ['Bench press', 'banca', 'press plano'] }),
    exercise({ name: 'Press de banca con mancuernas', aliases: ['Dumbbell bench press'] }),
    exercise({ name: 'Curl de bíceps con barra', aliases: ['Barbell curl'] }),
  ];
  const names = (query: string) => searchExercises(reviewed, query).map((item) => item.name);

  it('puts the plain exercise before its variants', () => {
    expect(names('press de banca')).toEqual(['Press de banca', 'Press de banca con mancuernas']);
  });

  it('finds a word inside the name, and other names in either language', () => {
    expect(names('banca')).toEqual([
      'Press de banca',
      'Press de banca con mancuernas',
      'Press inclinado con barra',
    ]);
    expect(names('bench')[0]).toBe('Press de banca');
  });

  it('ignores accents and case', () => {
    expect(names('BICEPS')).toEqual(['Curl de bíceps con barra']);
  });

  it('keeps the list as it is without a query', () => {
    expect(searchExercises(reviewed, '  ')).toBe(reviewed);
  });
});
