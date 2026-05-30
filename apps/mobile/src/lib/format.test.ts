import { describe, expect, it } from 'vitest';

import { durationSecondsBetween, formatDuration } from './format';

describe('formatDuration', () => {
  it('formats sub-hour durations as m:ss', () => {
    expect(formatDuration(0)).toBe('0:00');
    expect(formatDuration(65)).toBe('1:05');
    expect(formatDuration(600)).toBe('10:00');
  });

  it('formats hour+ durations as h:mm:ss', () => {
    expect(formatDuration(3661)).toBe('1:01:01');
  });

  it('clamps negative values to zero', () => {
    expect(formatDuration(-10)).toBe('0:00');
  });
});

describe('durationSecondsBetween', () => {
  it('returns the elapsed seconds between two timestamps', () => {
    expect(
      durationSecondsBetween(
        '2026-05-30T09:00:00.000Z',
        '2026-05-30T09:30:30.000Z',
      ),
    ).toBe(1830);
  });

  it('returns 0 when a timestamp is missing or invalid', () => {
    expect(durationSecondsBetween(undefined, '2026-05-30T09:00:00.000Z')).toBe(0);
    expect(durationSecondsBetween('nope', 'also-nope')).toBe(0);
  });
});
