/** Local midnight of `date`. */
export function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/** The local day `delta` days away (calendar days, safe across DST). */
export function shiftDay(day: Date, delta: number): Date {
  return new Date(day.getFullYear(), day.getMonth(), day.getDate() + delta);
}

export function isSameLocalDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/**
 * The chosen local day at the time of day of `time`, as an ISO timestamp.
 * New entries take the current time and edits keep their own, so two entries
 * on one day stay in order (spec 0027 EF-3).
 */
export function combineDayAndTime(day: Date, time: Date): string {
  return new Date(
    day.getFullYear(),
    day.getMonth(),
    day.getDate(),
    time.getHours(),
    time.getMinutes(),
    time.getSeconds(),
    time.getMilliseconds(),
  ).toISOString();
}
