import { describe, expect, it } from 'vitest';

import {
  formatWarmUpTarget,
  toEditableWarmUpItems,
  toWarmUpItemsInput,
  type EditableWarmUpItem,
} from './warmUpItems';

const row = (overrides: Partial<EditableWarmUpItem>): EditableWarmUpItem => ({
  id: 'x',
  name: '',
  target: '',
  targetKind: 'time',
  ...overrides,
});

describe('warm-up block items (spec 0024)', () => {
  it('formats a time or a reps target', () => {
    expect(formatWarmUpTarget({ targetDurationSeconds: 300 })).toBe('5:00');
    expect(formatWarmUpTarget({ targetReps: 15 })).toBe('× 15');
    expect(formatWarmUpTarget({})).toBe('');
  });

  it('reads typed rows into the block, dropping unnamed ones (FR-5)', () => {
    expect(
      toWarmUpItemsInput([
        row({ name: ' Bike ', target: '5:00' }),
        row({ name: '', target: '10' }),
        row({ name: 'Band pull-aparts', target: '15', targetKind: 'reps' }),
        row({ name: 'Hip circles' }),
      ]),
    ).toEqual([
      { name: 'Bike', targetDurationSeconds: 300 },
      { name: 'Band pull-aparts', targetReps: 15 },
      { name: 'Hip circles' },
    ]);
  });

  it('refuses a target it cannot read', () => {
    expect(toWarmUpItemsInput([row({ name: 'Bike', target: '5 min' })])).toBeNull();
    expect(toWarmUpItemsInput([row({ name: 'Bands', target: '1.5', targetKind: 'reps' })])).toBeNull();
  });

  it('turns a stored block back into rows, in order', () => {
    let id = 0;
    const rows = toEditableWarmUpItems(
      [
        { order: 2, name: 'Band pull-aparts', targetReps: 15 },
        { order: 1, name: 'Bike', targetDurationSeconds: 300 },
      ],
      () => `row-${(id += 1)}`,
    );

    expect(rows.map((item) => [item.name, item.target, item.targetKind])).toEqual([
      ['Bike', '5:00', 'time'],
      ['Band pull-aparts', '15', 'reps'],
    ]);
    expect(toWarmUpItemsInput(rows)).toEqual([
      { name: 'Bike', targetDurationSeconds: 300 },
      { name: 'Band pull-aparts', targetReps: 15 },
    ]);
  });
});
