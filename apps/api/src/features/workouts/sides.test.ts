import { describe, expect, it } from 'vitest';

import { parseSideReps, recordReps, withSideTotal } from './sides.js';

describe('parseSideReps', () => {
  it('keeps positive whole numbers only (EF-1: 0 is not done)', () => {
    expect(parseSideReps(10)).toBe(10);
    expect(parseSideReps(0)).toBeUndefined();
    expect(parseSideReps(-2)).toBeUndefined();
    expect(parseSideReps(2.5)).toBeUndefined();
    expect(parseSideReps('8')).toBeUndefined();
  });
});

describe('withSideTotal', () => {
  it('leaves a set without sides as it is', () => {
    const set = { reps: 8, weightKg: 20 };
    expect(withSideTotal(set)).toBe(set);
  });

  it('replaces reps with the sum of both sides (AC-1)', () => {
    expect(withSideTotal({ reps: 99, repsLeft: 10, repsRight: 8 })).toMatchObject({
      reps: 18,
      repsLeft: 10,
      repsRight: 8,
    });
  });

  it('counts a missing side as not done (EF-1)', () => {
    expect(withSideTotal({ repsLeft: 10 })).toMatchObject({ reps: 10, repsLeft: 10 });
  });
});

describe('recordReps', () => {
  it('uses the better side of a set with sides', () => {
    expect(recordReps({ reps: 18, repsLeft: 10, repsRight: 8 })).toBe(10);
    expect(recordReps({ reps: 7, repsRight: 7 })).toBe(7);
  });

  it('uses reps for a set without sides', () => {
    expect(recordReps({ reps: 8 })).toBe(8);
    expect(recordReps({})).toBeUndefined();
  });
});
