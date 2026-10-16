import { describe, expect, it, vi } from 'vitest';

vi.mock('@/config/api', () => ({ API_BASE_URL: 'http://test' }));

import { ApiError } from '@/lib/http';

import { parseDecimalInput, readRangeError, toInputString } from './form';

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
  it('keeps one decimal at most and blanks missing values', () => {
    expect(toInputString(82.4166)).toBe('82.4');
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
