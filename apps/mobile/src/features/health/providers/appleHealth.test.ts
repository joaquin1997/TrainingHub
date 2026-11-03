import { describe, expect, it, vi } from 'vitest';

vi.mock('../../../../modules/health-energy', () => ({ HealthEnergy: null }));
vi.mock('../../../../modules/workout-live-activity', () => ({ WorkoutLiveActivity: null }));

import { runningRestEndMs } from './appleHealth';

describe('runningRestEndMs (spec 0040 FR-3)', () => {
  const now = Date.parse('2026-10-21T10:00:00.000Z');

  it('passes a rest end that is still ahead', () => {
    expect(runningRestEndMs('2026-10-21T10:01:00.000Z', now)).toBe(now + 60_000);
  });

  it('drops a rest that has ended, so no countdown is left at 0:00', () => {
    expect(runningRestEndMs('2026-10-21T09:59:59.000Z', now)).toBeNull();
    expect(runningRestEndMs('2026-10-21T10:00:00.000Z', now)).toBeNull();
  });

  it('is null without a rest', () => {
    expect(runningRestEndMs(undefined, now)).toBeNull();
  });
});
