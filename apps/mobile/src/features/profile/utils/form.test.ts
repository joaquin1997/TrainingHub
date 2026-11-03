import { describe, expect, it, vi } from 'vitest';

vi.mock('@/config/api', () => ({ API_BASE_URL: 'http://test' }));

import { ApiError } from '@/lib/http';

import { entryToTexts, parseDecimalInput, readRangeError, textsToValues, toInputString } from './form';

describe('parseDecimalInput', () => {
  it('reads dots and commas as the decimal separator', () => {
    expect(parseDecimalInput('82.4')).toBe(82.4);
    expect(parseDecimalInput(' 82,4 ')).toBe(82.4);
    expect(parseDecimalInput('180')).toBe(180);
  });

  it('treats empty as not measured and junk as invalid', () => {
    expect(parseDecimalInput('')).toBeNull();
    expect(parseDecimalInput('  ')).toBeNull();
    expect(parseDecimalInput('abc')).toBeUndefined();
    expect(parseDecimalInput('-5')).toBeUndefined();
    expect(parseDecimalInput('1.2.3')).toBeUndefined();
  });
});

describe('toInputString', () => {
  it('keeps two decimals at most and blanks missing values (spec 0040 FR-7)', () => {
    expect(toInputString(82.4166)).toBe('82.42');
    expect(toInputString(80)).toBe('80');
    expect(toInputString(null)).toBe('');
  });
});

describe('readRangeError', () => {
  it('returns the range from a 400 body', () => {
    const body = { message: 'x', field: 'waistCm', min: 40, max: 200 };
    expect(readRangeError(new ApiError('x', 400, body))).toEqual(body);
  });

  it('ignores other failures', () => {
    expect(readRangeError(new ApiError('x', 400, { message: 'x' }))).toBeNull();
    expect(readRangeError(new ApiError('x', 500, { field: 'waistCm', min: 1, max: 2 }))).toBeNull();
    expect(readRangeError(new Error('offline'))).toBeNull();
  });
});

describe('entry form values', () => {
  it('converts typed display values to canonical units', () => {
    const texts = { ...entryToTexts(undefined, 'lb'), weightKg: '181.7', waistCm: '34,6' };
    const result = textsToValues(texts, undefined, 'lb');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.count).toBe(2);
      expect(result.values.weightKg).toBeCloseTo(82.418, 3);
      expect(result.values.waistCm).toBeCloseTo(87.884, 3);
      expect(result.values.chestCm).toBeNull();
    }
  });

  it('keeps the stored kg of an untouched field when editing in lb', () => {
    const original = { weightKg: 82.4, bodyFatPercent: 18 };
    const texts = { ...entryToTexts(original, 'lb'), bodyFatPercent: '17.5' };
    const result = textsToValues(texts, original, 'lb');

    expect(texts.weightKg).toBe('181.7');
    expect(result).toMatchObject({ ok: true, count: 2, values: { weightKg: 82.4, bodyFatPercent: 17.5 } });
  });

  it('clears a field emptied by the person and flags junk', () => {
    const original = { weightKg: 82.4, waistCm: 88 };
    const cleared = textsToValues({ ...entryToTexts(original, 'kg'), waistCm: '' }, original, 'kg');
    expect(cleared).toMatchObject({ ok: true, count: 1, values: { waistCm: null } });

    const junk = textsToValues({ ...entryToTexts(undefined, 'kg'), neckCm: 'abc' }, undefined, 'kg');
    expect(junk).toEqual({ ok: false, invalid: 'neckCm' });
  });
});
