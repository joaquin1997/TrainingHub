import { describe, expect, it } from 'vitest';

import { exerciseBlockLabels } from './exerciseBlockLabels';

const labels = (groups: Array<number | undefined>) =>
  exerciseBlockLabels(groups.map((supersetGroup) => ({ supersetGroup }))).map((l) => l.label);

describe('exerciseBlockLabels', () => {
  it('numbers standalone exercises consecutively', () => {
    expect(labels([undefined, undefined, undefined])).toEqual(['1', '2', '3']);
  });

  it('gives a superset one number and letters (AC-5)', () => {
    expect(labels([undefined, 1, 1, undefined])).toEqual(['1', '2A', '2B', '3']);
  });

  it('marks the run positions and the superset number', () => {
    const result = exerciseBlockLabels([{ supersetGroup: 4 }, { supersetGroup: 4 }, { supersetGroup: 4 }]);
    expect(result.map((l) => l.superset)).toEqual(['start', 'middle', 'end']);
    expect(result.every((l) => l.supersetIndex === 1)).toBe(true);
  });

  it('treats a group of one as a standalone exercise', () => {
    expect(exerciseBlockLabels([{ supersetGroup: 1 }, {}])).toEqual([
      { label: '1', superset: 'none' },
      { label: '2', superset: 'none' },
    ]);
  });

  it('starts a new run when the same group appears again later', () => {
    expect(labels([1, 1, undefined, 1, 1])).toEqual(['1A', '1B', '2', '3A', '3B']);
  });

  it('separates adjacent supersets with different groups', () => {
    expect(labels([1, 1, 2, 2])).toEqual(['1A', '1B', '2A', '2B']);
  });

  it('returns nothing for no exercises', () => {
    expect(exerciseBlockLabels([])).toEqual([]);
  });
});
