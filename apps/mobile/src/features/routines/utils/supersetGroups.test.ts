import { describe, expect, it } from 'vitest';

import {
  joinWithNext,
  leaveSuperset,
  moveInGroups,
  normalizeSupersetGroups,
  removeKeepingGroups,
  supersetKind,
  supersetRuns,
} from './supersetGroups';

type Row = { id: string; supersetGroup?: number };

/** Rows from a compact spec: 'A1' = id A in group 1, 'C' = alone. */
const rows = (...specs: string[]): Row[] =>
  specs.map((spec) => {
    const group = spec.slice(1);
    return group ? { id: spec[0]!, supersetGroup: Number(group) } : { id: spec[0]! };
  });

/** Back to the compact form, for readable expectations. */
const shape = (items: Row[]) =>
  items.map((item) => `${item.id}${item.supersetGroup ?? ''}`);

describe('supersetRuns', () => {
  it('finds supersets as runs of two or more adjacent items', () => {
    expect(supersetRuns(rows('A', 'B1', 'C1', 'D'))).toEqual([
      { start: 0, end: 1, isSuperset: false },
      { start: 1, end: 3, isSuperset: true },
      { start: 3, end: 4, isSuperset: false },
    ]);
  });
});

describe('normalizeSupersetGroups (EF-4)', () => {
  it('keeps a routine saved before 0029 as it is drawn (AC-12)', () => {
    expect(shape(normalizeSupersetGroups(rows('A1', 'B1', 'C', 'D1')))).toEqual([
      'A1',
      'B1',
      'C',
      'D',
    ]);
  });

  it('numbers supersets in order and keeps items that do not change', () => {
    const input = rows('A7', 'B7', 'C3', 'D3', 'E');
    const result = normalizeSupersetGroups(input);
    expect(shape(result)).toEqual(['A1', 'B1', 'C2', 'D2', 'E']);
    expect(result[4]).toBe(input[4]);
  });

  it('splits two adjacent runs only when their numbers differ', () => {
    expect(shape(normalizeSupersetGroups(rows('A1', 'B1', 'C2', 'D2')))).toEqual([
      'A1',
      'B1',
      'C2',
      'D2',
    ]);
  });
});

describe('moveInGroups', () => {
  it('reorders inside a superset (FR-18)', () => {
    expect(shape(moveInGroups(rows('A1', 'B1', 'C1'), 2, 'up'))).toEqual(['A1', 'C1', 'B1']);
    expect(shape(moveInGroups(rows('A1', 'B1', 'C1'), 0, 'down'))).toEqual(['B1', 'A1', 'C1']);
  });

  it('takes the first item out when moved up; a superset of one is normal (FR-19, AC-9)', () => {
    expect(shape(moveInGroups(rows('A1', 'B1'), 0, 'up'))).toEqual(['A', 'B']);
    expect(shape(moveInGroups(rows('X', 'A1', 'B1', 'C1'), 1, 'up'))).toEqual([
      'X',
      'A',
      'B1',
      'C1',
    ]);
  });

  it('takes the last item out when moved down (FR-19)', () => {
    expect(shape(moveInGroups(rows('A1', 'B1', 'C1', 'X'), 2, 'down'))).toEqual([
      'A1',
      'B1',
      'C',
      'X',
    ]);
  });

  it('moves an item alone past the whole superset, never into it (FR-20, AC-10)', () => {
    expect(shape(moveInGroups(rows('A1', 'B1', 'X'), 2, 'up'))).toEqual(['X', 'A1', 'B1']);
    expect(shape(moveInGroups(rows('X', 'A1', 'B1', 'C1'), 0, 'down'))).toEqual([
      'A1',
      'B1',
      'C1',
      'X',
    ]);
  });

  it('swaps items alone as before', () => {
    expect(shape(moveInGroups(rows('X', 'Y', 'Z'), 1, 'up'))).toEqual(['Y', 'X', 'Z']);
  });

  it('leaves the list as it is at the ends', () => {
    expect(shape(moveInGroups(rows('X', 'Y'), 0, 'up'))).toEqual(['X', 'Y']);
    expect(shape(moveInGroups(rows('X', 'Y'), 1, 'down'))).toEqual(['X', 'Y']);
  });
});

describe('joinWithNext (FR-16)', () => {
  it('joins two items alone without typing a number (AC-8)', () => {
    expect(shape(joinWithNext(rows('A', 'B', 'C'), 0))).toEqual(['A1', 'B1', 'C']);
  });

  it('adds an item to the superset below or above it', () => {
    expect(shape(joinWithNext(rows('X', 'A1', 'B1'), 0))).toEqual(['X1', 'A1', 'B1']);
    expect(shape(joinWithNext(rows('A1', 'B1', 'X'), 1))).toEqual(['A1', 'B1', 'X1']);
  });

  it('merges two supersets that meet', () => {
    expect(shape(joinWithNext(rows('A1', 'B1', 'C2', 'D2'), 1))).toEqual([
      'A1',
      'B1',
      'C1',
      'D1',
    ]);
  });

  it('does nothing on the last item', () => {
    expect(shape(joinWithNext(rows('A', 'B'), 1))).toEqual(['A', 'B']);
  });
});

describe('leaveSuperset (FR-16, FR-17)', () => {
  it('turns the other item of a pair into a normal exercise', () => {
    expect(shape(leaveSuperset(rows('A1', 'B1'), 1))).toEqual(['A', 'B']);
  });

  it('moves a middle item to just after the superset, which stays whole', () => {
    expect(shape(leaveSuperset(rows('A1', 'B1', 'C1', 'X'), 1))).toEqual([
      'A1',
      'C1',
      'B',
      'X',
    ]);
  });

  it('does nothing to an item alone', () => {
    expect(shape(leaveSuperset(rows('A', 'B'), 0))).toEqual(['A', 'B']);
  });
});

describe('removeKeepingGroups (FR-21)', () => {
  it('keeps the superset for the others', () => {
    expect(shape(removeKeepingGroups(rows('A1', 'B1', 'C1'), 1))).toEqual(['A1', 'C1']);
  });

  it('never merges two supersets that shared a number', () => {
    expect(shape(removeKeepingGroups(rows('A1', 'B1', 'X', 'C1', 'D1'), 2))).toEqual([
      'A1',
      'B1',
      'C2',
      'D2',
    ]);
  });

  it('turns a superset left with one item into a normal exercise', () => {
    expect(shape(removeKeepingGroups(rows('A1', 'B1', 'X'), 0))).toEqual(['B', 'X']);
  });
});

describe('supersetKind (FR-12)', () => {
  it('labels by size', () => {
    expect(supersetKind(2)).toBe('superset');
    expect(supersetKind(3)).toBe('triset');
    expect(supersetKind(4)).toBe('giantset');
    expect(supersetKind(7)).toBe('giantset');
  });
});
