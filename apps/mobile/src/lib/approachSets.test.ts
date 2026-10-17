import { describe, expect, it } from 'vitest';

import { approachSets, roundToLoadable } from './approachSets';
import { fromKg, roundWeight } from './weight';

const isMultipleOf = (value: number, step: number) =>
  Math.abs(value / step - Math.round(value / step)) < 1e-9;

describe('approachSets', () => {
  it('ramps 140 kg as bar × 10, 40 % × 5, 60 % × 3, 75 % × 2, 90 % × 1 (AC-1)', () => {
    const sets = approachSets(140, 'kg');

    expect(sets).toEqual([
      { weight: 20, reps: 10 },
      { weight: 55, reps: 5 },
      { weight: 85, reps: 3 },
      { weight: 105, reps: 2 },
      { weight: 125, reps: 1 },
    ]);
    for (const [index, set] of sets.entries()) {
      expect(set.weight).toBeLessThan(140);
      expect(isMultipleOf(set.weight, 2.5)).toBe(true);
      if (index > 0) {
        expect(set.weight).toBeGreaterThan(sets[index - 1]!.weight);
      }
    }
  });

  it('uses 5 lb steps and a 45 lb bar in pounds (AC-2)', () => {
    expect(approachSets(315, 'lb')).toEqual([
      { weight: 45, reps: 10 },
      { weight: 125, reps: 5 },
      { weight: 190, reps: 3 },
      { weight: 235, reps: 2 },
      { weight: 285, reps: 1 },
    ]);

    // 140 kg as a person in lb sees it (308.6 lb).
    const fromKgWorking = approachSets(roundWeight(fromKg(140, 'lb')), 'lb');
    expect(fromKgWorking).toHaveLength(5);
    for (const set of fromKgWorking) {
      expect(isMultipleOf(set.weight, 5)).toBe(true);
      expect(set.weight).toBeLessThan(308.6);
    }
  });

  it('never goes below the empty bar (FR-3)', () => {
    for (const set of approachSets(60, 'kg')) {
      expect(set.weight).toBeGreaterThanOrEqual(20);
    }
    expect(roundToLoadable(5, 'kg')).toBe(20);
    expect(roundToLoadable(10, 'lb')).toBe(45);
  });

  it('gives fewer sets for a light working weight, none as heavy as it (EF-2)', () => {
    expect(approachSets(30, 'kg')).toEqual([
      { weight: 20, reps: 10 },
      { weight: 22.5, reps: 2 },
      { weight: 27.5, reps: 1 },
    ]);
    expect(approachSets(22.5, 'kg')).toEqual([{ weight: 20, reps: 10 }]);
  });

  it('gives none at or below the bar, or without a weight', () => {
    expect(approachSets(20, 'kg')).toEqual([]);
    expect(approachSets(21, 'kg')).toEqual([]);
    expect(approachSets(45, 'lb')).toEqual([]);
    expect(approachSets(0, 'kg')).toEqual([]);
    expect(approachSets(Number.NaN, 'kg')).toEqual([]);
  });

  it('rounds to the nearest loadable step', () => {
    expect(roundToLoadable(56, 'kg')).toBe(55);
    expect(roundToLoadable(126, 'kg')).toBe(125);
    expect(roundToLoadable(57.6, 'kg')).toBe(57.5);
    expect(roundToLoadable(283.5, 'lb')).toBe(285);
  });
});
