export type DayPart = 'morning' | 'afternoon' | 'evening';

/**
 * Part of the day for the home greeting (spec 0035 FR-2), from the device's
 * local time: morning 05:00–11:59, afternoon 12:00–19:59, evening otherwise.
 */
export function dayPart(now: Date): DayPart {
  const hour = now.getHours();
  if (hour >= 5 && hour < 12) {
    return 'morning';
  }
  return hour >= 12 && hour < 20 ? 'afternoon' : 'evening';
}

/** The i18n key of the greeting, with or without the person's name (EF-1). */
export function greetingKey(now: Date, name: string | null | undefined) {
  const part = dayPart(now);
  const suffix = name?.trim() ? 'Name' : '';
  const keys = {
    morning: `home.greetingMorning${suffix}`,
    afternoon: `home.greetingAfternoon${suffix}`,
    evening: `home.greetingEvening${suffix}`,
  } as const;
  return keys[part];
}
