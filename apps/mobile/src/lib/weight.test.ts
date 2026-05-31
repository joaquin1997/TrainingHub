import { describe, expect, it } from 'vitest';

import {
  formatWeight,
  formatWeightValue,
  fromKg,
  kgToInputString,
  roundWeight,
  toKg,
} from './weight';

describe('weight conversion', () => {
  it('is identity for kg', () => {
    expect(fromKg(60, 'kg')).toBe(60);
    expect(toKg(60, 'kg')).toBe(60);
  });

  it('converts kg <-> lb and round-trips', () => {
    expect(roundWeight(fromKg(100, 'lb'))).toBe(220.5);
    expect(roundWeight(toKg(220.5, 'lb'))).toBe(100);
  });

  it('keeps integer kg input strings clean', () => {
    expect(kgToInputString(50, 'kg')).toBe('50');
    expect(kgToInputString(50, 'lb')).toBe('110.2');
  });
});

describe('weight formatting', () => {
  it('appends the unit label', () => {
    expect(formatWeight(60, 'kg')).toBe('60 kg');
    expect(formatWeight(60, 'lb')).toBe('132.3 lb');
  });

  it('renders an en dash for missing values', () => {
    expect(formatWeight(undefined, 'kg')).toBe('–');
    expect(formatWeightValue(null, 'lb')).toBe('–');
  });
});
