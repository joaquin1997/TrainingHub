import { describe, expect, it, vi } from 'vitest';

const native = vi.hoisted(() => ({
  isSupported: () => true,
  update: vi.fn(async () => undefined),
  setPause: vi.fn(async () => undefined),
  setKcal: vi.fn(async () => undefined),
  setRest: vi.fn(async () => undefined),
  setProgress: vi.fn(async () => undefined),
}));

vi.mock('../../../../modules/health-energy', () => ({ HealthEnergy: null }));
vi.mock('../../../../modules/workout-live-activity', () => ({ WorkoutLiveActivity: native }));

import { appleHealthLiveWorkoutBridge } from './appleHealth';

describe('live workout status update (spec 0045)', () => {
  it('sends every field in one update, so the rest is not lost', async () => {
    const restEndsAt = new Date(Date.now() + 90_000).toISOString();

    await appleHealthLiveWorkoutBridge.updateLiveWorkout({
      workoutSessionId: 'w1',
      startedAt: '2026-11-03T09:00:00.000Z',
      exerciseCount: 3,
      pausedSeconds: 12,
      activeEnergyKcal: 104.6,
      restEndsAt,
      upNext: 'Press · 60 kg × 8',
      setsDone: 4,
      setsTotal: 12,
    });

    expect(native.update).toHaveBeenCalledTimes(1);
    expect(native.update).toHaveBeenCalledWith('w1', expect.objectContaining({
      pausedAtMs: null,
      pausedSeconds: 12,
      activeKcal: 105,
      restEndsAtMs: Date.parse(restEndsAt),
      upNext: 'Press · 60 kg × 8',
      setsDone: 4,
      setsTotal: 12,
    }));
    expect(native.setRest).not.toHaveBeenCalled();
    expect(native.setProgress).not.toHaveBeenCalled();
  });
});
