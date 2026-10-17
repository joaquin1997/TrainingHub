import { describe, expect, it } from 'vitest';

import { combineDayAndTime, isSameLocalDay, shiftDay, startOfLocalDay } from './entryDate';

describe('entry dates', () => {
  it('moves by calendar days across a month end', () => {
    const day = new Date(2026, 9, 31);
    expect(shiftDay(day, 1)).toEqual(new Date(2026, 10, 1));
    expect(shiftDay(day, -31)).toEqual(new Date(2026, 8, 30));
  });

  it('compares local days, ignoring the time', () => {
    expect(isSameLocalDay(new Date(2026, 9, 16, 7), new Date(2026, 9, 16, 21))).toBe(true);
    expect(isSameLocalDay(new Date(2026, 9, 16), new Date(2026, 9, 17))).toBe(false);
    expect(startOfLocalDay(new Date(2026, 9, 16, 7, 30))).toEqual(new Date(2026, 9, 16));
  });

  it('keeps the time of day when the day changes', () => {
    const iso = combineDayAndTime(new Date(2026, 9, 1), new Date(2026, 9, 16, 7, 30, 15));
    expect(new Date(iso)).toEqual(new Date(2026, 9, 1, 7, 30, 15));
  });
});
