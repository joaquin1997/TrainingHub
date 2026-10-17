import { describe, expect, it } from 'vitest';

import {
  isSetTimerFinished,
  setTimerDisplaySeconds,
  setTimerFillSeconds,
} from './setTimer';

const start = 1_000_000;

describe('set timer (spec 0021 FR-4)', () => {
  it('counts down from the set time and finishes at zero', () => {
    const timer = { startedAt: start, targetSeconds: 45 };

    expect(setTimerDisplaySeconds(timer, start + 10_400)).toBe(35);
    expect(isSetTimerFinished(timer, start + 44_900)).toBe(false);
    expect(isSetTimerFinished(timer, start + 45_000)).toBe(true);
    expect(setTimerDisplaySeconds(timer, start + 50_000)).toBe(0);
    expect(setTimerFillSeconds(timer, start + 50_000)).toBe(45);
  });

  it('a countdown stopped early fills the time done', () => {
    expect(setTimerFillSeconds({ startedAt: start, targetSeconds: 60 }, start + 38_700)).toBe(38);
  });

  it('counts up without a time and fills what elapsed', () => {
    const timer = { startedAt: start };

    expect(setTimerDisplaySeconds(timer, start + 72_000)).toBe(72);
    expect(isSetTimerFinished(timer, start + 3_600_000)).toBe(false);
    expect(setTimerFillSeconds(timer, start + 72_000)).toBe(72);
  });
});
