import { describe, expect, it } from 'vitest';

import { proposeCarryOver } from './carryOver.js';
import { loadCatalog } from './catalog.js';

const catalog = loadCatalog();
const propose = (name: string) => proposeCarryOver([{ id: 'x', name, source: 'wger' }], catalog)[0]!;

describe('proposeCarryOver (spec 0044 task 5)', () => {
  it('matches a name or search name exactly, ignoring case and accents', () => {
    expect(propose('Bench Press')).toMatchObject({ slug: 'barbell-bench-press', confidence: 'exact' });
    expect(propose('Backsquat')).toMatchObject({ slug: 'back-squat', confidence: 'exact' });
    expect(propose('Prensa de piernas')).toMatchObject({ slug: 'leg-press', confidence: 'exact' });
    expect(propose('extension de cuadriceps')).toMatchObject({ slug: 'leg-extension', confidence: 'exact' });
  });

  it('proposes a probable match from shared words', () => {
    expect(propose('Curl femoral tumbado en máquina')).toMatchObject({
      slug: 'lying-leg-curl',
      confidence: 'probable',
    });
  });

  it('proposes nothing for an unrelated name (EF-3)', () => {
    expect(propose('1/2 Kneeling Thoracic Rotation')).toMatchObject({ confidence: 'none' });
  });
});
