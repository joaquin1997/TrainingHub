import { describe, expect, it } from 'vitest';

import { setNumberOf } from './setNumber';

const sets = [
  { id: 'w1', type: 'warmup' as const },
  { id: 'w2', type: 'warmup' as const },
  { id: 's1', type: 'normal' as const },
  { id: 's2', type: 'failure' as const },
  { id: 's3' },
];

describe('setNumberOf', () => {
  it('numbers working sets from 1 after the warm-ups', () => {
    expect(setNumberOf(sets, 's1')).toEqual({ number: 1, count: 3, isWarmup: false });
    expect(setNumberOf(sets, 's2')).toEqual({ number: 2, count: 3, isWarmup: false });
    expect(setNumberOf(sets, 's3')).toEqual({ number: 3, count: 3, isWarmup: false });
  });

  it('numbers warm-ups among themselves', () => {
    expect(setNumberOf(sets, 'w2')).toEqual({ number: 2, count: 2, isWarmup: true });
  });

  it('is null for a set that is not there', () => {
    expect(setNumberOf(sets, 'nope')).toBeNull();
  });
});
