import { describe, expect, it } from 'vitest';

import { formatDuration } from './format';
import {
  formatDistance,
  formatSetValues,
  isTimedOrDistance,
  parseDistanceInput,
  parseDurationInput,
  trackingFields,
} from './tracking';

describe('trackingFields', () => {
  it('maps each tracking type to its set fields', () => {
    expect(trackingFields('weight_reps')).toEqual(['weight', 'reps']);
    expect(trackingFields('reps')).toEqual(['reps']);
    expect(trackingFields('duration')).toEqual(['duration']);
    expect(trackingFields('weight_duration')).toEqual(['weight', 'duration']);
    expect(trackingFields('distance_duration')).toEqual(['distance', 'duration']);
  });

  it('reads an absent type as weight & reps (AC-3)', () => {
    expect(trackingFields(undefined)).toEqual(['weight', 'reps']);
    expect(isTimedOrDistance(undefined)).toBe(false);
    expect(isTimedOrDistance('distance_duration')).toBe(true);
  });
});

describe('parseDurationInput', () => {
  it('reads plain digits as seconds, shown as m:ss (EF-2)', () => {
    expect(parseDurationInput('90')).toBe(90);
    expect(formatDuration(90)).toBe('1:30');
  });

  it('reads m:ss and h:mm:ss', () => {
    expect(parseDurationInput('1:30')).toBe(90);
    expect(parseDurationInput(' 0:45 ')).toBe(45);
    expect(parseDurationInput('1:02:03')).toBe(3723);
  });

  it('is undefined when empty and null when invalid', () => {
    expect(parseDurationInput('  ')).toBeUndefined();
    expect(parseDurationInput('1:75')).toBeNull();
    expect(parseDurationInput('abc')).toBeNull();
    expect(parseDurationInput('1.5')).toBeNull();
  });
});

describe('distance', () => {
  it('parses metres, accepting a decimal comma', () => {
    expect(parseDistanceInput('500')).toBe(500);
    expect(parseDistanceInput('42,5')).toBe(42.5);
    expect(parseDistanceInput('')).toBeUndefined();
    expect(parseDistanceInput('-3')).toBeNull();
  });

  it('shows metres below a kilometre and km from there', () => {
    expect(formatDistance(500)).toBe('500 m');
    expect(formatDistance(1500)).toBe('1.5 km');
    expect(formatDistance(5000)).toBe('5 km');
  });
});

describe('formatSetValues', () => {
  it('keeps the weight × reps line when there is no time or distance', () => {
    expect(formatSetValues({ weightKg: 60, reps: 8 }, 'kg')).toBe('60 kg × 8');
  });

  it('shows what was logged, whatever the exercise tracks now (AC-1, EF-1)', () => {
    expect(formatSetValues({ durationSeconds: 60 }, 'kg')).toBe('1:00');
    expect(formatSetValues({ weightKg: 24, durationSeconds: 45 }, 'kg')).toBe('24 kg · 0:45');
    expect(formatSetValues({ distanceMeters: 500, durationSeconds: 105 }, 'kg')).toBe(
      '500 m · 1:45',
    );
  });
});
