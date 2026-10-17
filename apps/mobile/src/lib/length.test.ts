import { describe, expect, it } from 'vitest';

import {
  cmToFeetInches,
  feetInchesToCm,
  formatHeight,
  formatLength,
  fromCm,
  lengthUnitFor,
  toCm,
} from './length';

describe('length units', () => {
  it('follows the weight unit: cm with kg, in with lb', () => {
    expect(lengthUnitFor('kg')).toBe('cm');
    expect(lengthUnitFor('lb')).toBe('in');
  });

  it('converts cm to and from the display unit', () => {
    expect(fromCm(88, 'kg')).toBe(88);
    expect(fromCm(2.54, 'lb')).toBeCloseTo(1);
    expect(toCm(34.6, 'lb')).toBeCloseTo(87.884);
    expect(toCm(88, 'kg')).toBe(88);
  });

  it('formats lengths with one decimal', () => {
    expect(formatLength(88, 'kg')).toBe('88 cm');
    expect(formatLength(88, 'lb')).toBe('34.6 in');
  });

  it('shows 180 cm as 5 ft 11 in (AC-1)', () => {
    expect(cmToFeetInches(180)).toEqual({ feet: 5, inches: 11 });
    expect(formatHeight(180, 'lb')).toBe('5 ft 11 in');
    expect(formatHeight(180, 'kg')).toBe('180 cm');
  });

  it('turns feet and inches back into cm', () => {
    expect(feetInchesToCm(5, 11)).toBeCloseTo(180.34);
    expect(cmToFeetInches(feetInchesToCm(6, 0))).toEqual({ feet: 6, inches: 0 });
  });
});
