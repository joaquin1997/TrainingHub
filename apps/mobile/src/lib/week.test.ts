import { describe, expect, it } from 'vitest';

import { countInWeek, sameDay, sameWeek, startOfWeek, weekDays, weeksBack, weekStreak } from './week';

// Local dates, so the tests hold in any time zone. 2026-10-15 is a Thursday.
const at = (month: number, day: number, hour = 12, minute = 0) =>
  new Date(2026, month - 1, day, hour, minute);
const thursday = at(10, 15, 18);

describe('startOfWeek', () => {
  it('is the local Monday at midnight', () => {
    expect(startOfWeek(thursday)).toEqual(new Date(2026, 9, 12));
  });

  it('puts Sunday in the week that started the Monday before', () => {
    expect(startOfWeek(at(10, 18, 23, 30))).toEqual(new Date(2026, 9, 12));
    expect(startOfWeek(at(10, 19, 0, 5))).toEqual(new Date(2026, 9, 19));
  });
});

describe('weekDays', () => {
  it('lists Monday to Sunday', () => {
    const days = weekDays(thursday);
    expect(days).toHaveLength(7);
    expect(days[0]).toEqual(new Date(2026, 9, 12));
    expect(days[6]).toEqual(new Date(2026, 9, 18));
    expect(sameDay(days[3]!, thursday)).toBe(true);
  });
});

describe('weekStreak', () => {
  it('is 0 with no workouts', () => {
    expect(weekStreak([], thursday)).toBe(0);
  });

  it('counts this week and each consecutive week before it (AC-2)', () => {
    const starts = [at(10, 13), at(10, 7), at(9, 29), at(9, 22)];
    expect(weekStreak(starts, thursday)).toBe(4);
  });

  it('keeps last week alive while this week has none yet', () => {
    expect(weekStreak([at(10, 7), at(9, 29)], thursday)).toBe(2);
  });

  it('is 0 once a whole week passed without a workout', () => {
    // Last workout three weeks ago (AC-2): an old run is not current.
    expect(weekStreak([at(9, 24), at(9, 17), at(9, 10)], thursday)).toBe(0);
  });

  it('counts a week once however many workouts it had', () => {
    expect(weekStreak([at(10, 12), at(10, 13), at(10, 14)], thursday)).toBe(1);
  });

  it('counts a workout started Sunday night in that Sunday’s week (EF-12)', () => {
    const monday = at(10, 19, 9);
    expect(weekStreak([at(10, 18, 23, 30)], monday)).toBe(1);
    expect(countInWeek([at(10, 18, 23, 30)], monday)).toBe(0);
  });
});

describe('countInWeek', () => {
  it('counts only this week’s workouts', () => {
    expect(countInWeek([at(10, 12, 7), at(10, 15, 8), at(10, 11, 20)], thursday)).toBe(2);
  });
});

describe('sameWeek and weeksBack (spec 0040 FR-9)', () => {
  // Wednesday 2026-10-21, local time.
  const now = new Date(2026, 9, 21, 12, 0);

  it('tells whether a day is in the same Monday-to-Sunday week', () => {
    expect(sameWeek(new Date(2026, 9, 19, 7, 0), now)).toBe(true);
    expect(sameWeek(new Date(2026, 9, 25, 23, 0), now)).toBe(true);
    expect(sameWeek(new Date(2026, 9, 18, 23, 0), now)).toBe(false);
  });

  it('counts the weeks back to the earliest start, 0 with none', () => {
    expect(weeksBack([new Date(2026, 9, 20), new Date(2026, 9, 5)], now)).toBe(2);
    expect(weeksBack([], now)).toBe(0);
  });
});
