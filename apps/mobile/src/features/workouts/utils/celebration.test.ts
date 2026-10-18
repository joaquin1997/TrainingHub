import { describe, expect, it } from 'vitest';

import { CELEBRATED_MEMORY, parseCelebrated, shouldCelebrate, withCelebrated } from './celebration';

describe('record celebration (spec 0037)', () => {
  const base = { workoutId: 'w1', recordCount: 3, inFront: true, celebrated: [] as string[] };

  it('celebrates a workout that beat records, in front, once (AC-17, AC-18)', () => {
    expect(shouldCelebrate(base)).toBe(true);
    expect(shouldCelebrate({ ...base, celebrated: ['w1'] })).toBe(false);
  });

  it('never celebrates without records (AC-21, AC-22, EF-12)', () => {
    expect(shouldCelebrate({ ...base, recordCount: 0 })).toBe(false);
  });

  it('waits while the summary is not in front (FR-18)', () => {
    expect(shouldCelebrate({ ...base, inFront: false })).toBe(false);
  });

  it('remembers a bounded list, newest last', () => {
    let list: string[] = [];
    for (let index = 0; index < CELEBRATED_MEMORY + 5; index += 1) {
      list = withCelebrated(list, `w${index}`);
    }
    expect(list).toHaveLength(CELEBRATED_MEMORY);
    expect(list.at(-1)).toBe(`w${CELEBRATED_MEMORY + 4}`);
    expect(withCelebrated(['a', 'b'], 'a')).toEqual(['b', 'a']);
  });

  it('reads anything unreadable as nothing celebrated', () => {
    expect(parseCelebrated(null)).toEqual([]);
    expect(parseCelebrated('{')).toEqual([]);
    expect(parseCelebrated('["a",2]')).toEqual(['a']);
  });
});
