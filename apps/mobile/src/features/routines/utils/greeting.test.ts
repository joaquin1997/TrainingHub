import { describe, expect, it } from 'vitest';

import { dayPart, greetingKey } from './greeting';

const at = (hour: number, minute = 0) => new Date(2026, 9, 15, hour, minute);

describe('dayPart', () => {
  it('follows the local time of day (FR-2)', () => {
    expect(dayPart(at(5))).toBe('morning');
    expect(dayPart(at(11, 59))).toBe('morning');
    expect(dayPart(at(12))).toBe('afternoon');
    expect(dayPart(at(19, 59))).toBe('afternoon');
    expect(dayPart(at(20, 30))).toBe('evening');
    expect(dayPart(at(4, 59))).toBe('evening');
  });
});

describe('greetingKey', () => {
  it('names the person when there is a name (AC-1)', () => {
    expect(greetingKey(at(20, 30), 'Joaquín')).toBe('home.greetingEveningName');
  });

  it('reads without a name when there is none (EF-1)', () => {
    expect(greetingKey(at(9), null)).toBe('home.greetingMorning');
    expect(greetingKey(at(9), '  ')).toBe('home.greetingMorning');
  });
});
