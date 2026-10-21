import { describe, expect, it } from 'vitest';

import { loadCatalog, normaliseName, validateCatalog } from './catalog.js';
import type { CatalogEntry } from './vocabulary.js';

const bench: CatalogEntry = {
  slug: 'barbell-bench-press',
  es: 'Press de banca',
  en: 'Bench press',
  aliases: [],
  category: 'Chest',
  primary: ['chest'],
  secondary: ['triceps'],
  equipment: ['Barbell', 'Bench'],
  loadingKind: 'barbell',
  trackingType: 'weight_reps',
  unilateral: false,
};

describe('the reviewed catalog (spec 0044)', () => {
  it('is valid as committed', () => {
    const catalog = loadCatalog();
    expect(catalog.length).toBeGreaterThan(150);
    expect(validateCatalog(catalog)).toEqual([]);
  });
});

describe('validateCatalog', () => {
  it('accepts a complete entry', () => {
    expect(validateCatalog([bench])).toEqual([]);
  });

  it('finds duplicates by slug and by name in either language, ignoring accents', () => {
    const problems = validateCatalog([
      bench,
      { ...bench, slug: 'barbell-bench-press' },
      { ...bench, slug: 'other', es: 'Press de bánca', en: 'Other' },
    ]);
    expect(problems).toContain('barbell-bench-press: duplicate slug');
    expect(problems.some((line) => line.startsWith('other: es name'))).toBe(true);
  });

  it('requires a loading kind exactly when weight is recorded', () => {
    expect(validateCatalog([{ ...bench, loadingKind: undefined }])).toEqual([
      'barbell-bench-press: records weight, needs a loading kind',
    ]);
    expect(validateCatalog([{ ...bench, trackingType: 'reps' }])).toEqual([
      'barbell-bench-press: records no weight, must have no loading kind',
    ]);
  });

  it('rejects values outside the vocabularies', () => {
    const problems = validateCatalog([
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { ...bench, category: 'Legz', primary: ['pecs'], equipment: ['Rock'] } as any,
    ]);
    expect(problems).toEqual([
      'barbell-bench-press: unknown category Legz',
      'barbell-bench-press: unknown muscle pecs',
      'barbell-bench-press: unknown equipment Rock',
    ]);
  });
});

describe('normaliseName', () => {
  it('drops case, accents and punctuation', () => {
    expect(normaliseName('Extensión de  Cuádriceps!')).toBe('extension de cuadriceps');
  });
});
