import { describe, expect, it } from 'vitest';

import {
  currentCatalogLanguage,
  exerciseDisplayName,
  parseCatalogLanguage,
  runWithCatalogLanguage,
} from './requestLanguage.js';

describe('parseCatalogLanguage', () => {
  it('reads the first tag of Accept-Language', () => {
    expect(parseCatalogLanguage('en-GB,en;q=0.9')).toBe('en');
    expect(parseCatalogLanguage('es-ES')).toBe('es');
  });

  it('falls back to Spanish', () => {
    expect(parseCatalogLanguage(undefined)).toBe('es');
    expect(parseCatalogLanguage('fr')).toBe('es');
  });
});

describe('exerciseDisplayName', () => {
  const bench = { name: 'Press de banca', nameEs: 'Press de banca', nameEn: 'Bench press' };

  it('picks the name in the language, else the stored name', () => {
    expect(exerciseDisplayName(bench, 'en')).toBe('Bench press');
    expect(exerciseDisplayName(bench, 'es')).toBe('Press de banca');
    expect(exerciseDisplayName({ name: 'My row' }, 'en')).toBe('My row');
  });

  it('reads the language of the request it runs in', async () => {
    expect(currentCatalogLanguage()).toBe('es');
    await new Promise<void>((resolve) =>
      runWithCatalogLanguage('en', () => {
        setTimeout(() => {
          expect(exerciseDisplayName(bench)).toBe('Bench press');
          resolve();
        }, 0);
      }),
    );
  });
});
