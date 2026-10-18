/**
 * Calendar weeks in the device's local time, Monday to Sunday everywhere
 * (spec 0035 assumption). A workout belongs to the day and week it started
 * (EF-12).
 */

const DAY_MS = 24 * 60 * 60 * 1000;

/** Local midnight of the day `date` falls on. */
export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/** `date` moved by whole calendar days, keeping its local time of day. */
export function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days, date.getHours(), date.getMinutes(), date.getSeconds(), date.getMilliseconds());
}

/** Local Monday 00:00 of the week `date` falls in. */
export function startOfWeek(date: Date): Date {
  const day = startOfDay(date);
  // getDay: Sunday 0 … Saturday 6; Monday starts the week.
  const sinceMonday = (day.getDay() + 6) % 7;
  return addDays(day, -sinceMonday);
}

export function sameDay(left: Date, right: Date): boolean {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

/** Monday to Sunday of the week `now` falls in, each at local midnight. */
export function weekDays(now: Date): Date[] {
  const monday = startOfWeek(now);
  return Array.from({ length: 7 }, (_, index) => addDays(monday, index));
}

/** Whole weeks from `earlier`'s week to `later`'s (both Monday-aligned). */
function weeksBetween(earlier: Date, later: Date): number {
  // Rounded: a daylight-saving change makes a week 1 h shorter or longer.
  return Math.round((startOfWeek(later).getTime() - startOfWeek(earlier).getTime()) / (7 * DAY_MS));
}

/**
 * The week streak (glossary, spec 0035): consecutive weeks with at least one
 * workout, ending this week — or last week while this week has none yet.
 * 0 once a whole week passed without one.
 */
export function weekStreak(starts: Date[], now: Date): number {
  const weeks = new Set<number>();
  for (const start of starts) {
    const offset = weeksBetween(start, now);
    if (offset >= 0) {
      weeks.add(offset);
    }
  }

  // Offset 0 is this week; a streak may still be "alive" from last week.
  let offset = weeks.has(0) ? 0 : 1;
  let streak = 0;
  while (weeks.has(offset)) {
    streak += 1;
    offset += 1;
  }
  return streak;
}

/** How many of `starts` fall in the week `now` is in. */
export function countInWeek(starts: Date[], now: Date): number {
  const from = startOfWeek(now).getTime();
  const to = addDays(startOfWeek(now), 7).getTime();
  return starts.filter((start) => start.getTime() >= from && start.getTime() < to).length;
}
