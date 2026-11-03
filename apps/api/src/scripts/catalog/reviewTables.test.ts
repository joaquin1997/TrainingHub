import { describe, expect, it } from 'vitest';

import { reviewTable } from './reviewTables.js';

describe('reviewTable', () => {
  it('writes one Spanish row per exercise', () => {
    const table = reviewTable('Pecho', [
      {
        slug: 'cable-crossover',
        es: 'Cruce de poleas',
        en: 'Cable crossover',
        aliases: ['cable fly'],
        category: 'Chest',
        primary: ['chest'],
        secondary: ['shoulders'],
        equipment: ['Cable'],
        loadingKind: 'machine',
        trackingType: 'weight_reps',
        unilateral: false,
      },
    ]);

    expect(table).toContain('# Pecho (1)');
    expect(table).toContain(
      '| 1 | **Cruce de poleas**<br>Cable crossover | cable fly | pecho | hombros | polea | máquina/polea | peso × reps |  | — |',
    );
  });
});
