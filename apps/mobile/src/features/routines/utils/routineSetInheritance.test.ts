import { describe, expect, it } from 'vitest';

import {
  effectiveRoutineSetValue,
  inheritedSetValue,
  setFieldPlaceholder,
} from './routineSetInheritance';

const sets = [
  { minReps: '8', maxReps: '10', targetWeight: '65' },
  { minReps: '', maxReps: '', targetWeight: '' },
  { minReps: '6', maxReps: '', targetWeight: '' },
];

describe('inheritedSetValue', () => {
  it('returns the previous set value', () => {
    expect(inheritedSetValue(sets, 1, 'targetWeight')).toBe('65');
  });

  it('skips empty previous sets to the nearest non-empty one', () => {
    // set index 2 weight is empty; set 1 is empty; inherits from set 0.
    expect(inheritedSetValue(sets, 2, 'targetWeight')).toBe('65');
  });

  it('returns empty for the first set (nothing before it)', () => {
    expect(inheritedSetValue(sets, 0, 'minReps')).toBe('');
  });
});

describe('setFieldPlaceholder', () => {
  it('ghosts the inherited value when present', () => {
    expect(setFieldPlaceholder(sets, 1, 'minReps')).toBe('8');
  });

  it('falls back to the generic label for the first set', () => {
    expect(setFieldPlaceholder(sets, 0, 'maxReps')).toBe('Max reps');
    expect(setFieldPlaceholder(sets, 0, 'targetWeight')).toBe('Kg');
  });
});

describe('effectiveRoutineSetValue', () => {
  it('uses the own value when edited', () => {
    expect(effectiveRoutineSetValue(sets, 2, 'minReps')).toBe('6');
  });

  it('falls back to the inherited value when empty', () => {
    expect(effectiveRoutineSetValue(sets, 1, 'maxReps')).toBe('10');
    expect(effectiveRoutineSetValue(sets, 2, 'targetWeight')).toBe('65');
  });
});
