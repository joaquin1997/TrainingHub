import type { Routine } from '@workout/domain';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  clearActiveWorkout,
  getActiveWorkout,
  pauseWorkout,
  setActiveWorkout,
  startActiveWorkout,
  subscribeActiveWorkout,
} from '@/features/workouts/state/workoutDraftStore';

import { startActiveEnergyRefresher } from './activeEnergyRefresher';

const routine: Routine = {
  id: 'r1',
  userId: 'u1',
  name: 'Push',
  exercises: [],
  createdAt: '',
  updatedAt: '',
};

const store = { get: getActiveWorkout, subscribe: subscribeActiveWorkout };

function setup(read: () => Promise<number | null>) {
  const health = {
    requestPermissions: vi.fn(async () => true),
    readActiveEnergyKcal: vi.fn(read),
  };
  const onKcal = vi.fn();
  const refresher = startActiveEnergyRefresher({ health, store, onKcal, intervalMs: 60_000 });
  return { health, onKcal, refresher };
}

describe('startActiveEnergyRefresher', () => {
  let stop: () => void = () => undefined;

  beforeEach(() => {
    vi.useFakeTimers();
    clearActiveWorkout();
  });

  afterEach(() => {
    stop();
    vi.useRealTimers();
  });

  it('asks permission once and reads when a workout starts', async () => {
    const { health, onKcal, refresher } = setup(async () => 42);
    stop = refresher.stop;

    startActiveWorkout(routine, 'kg', 'u1');
    await vi.advanceTimersByTimeAsync(0);
    clearActiveWorkout();
    startActiveWorkout({ ...routine, id: 'r2' }, 'kg', 'u1');
    await vi.advanceTimersByTimeAsync(0);

    expect(health.requestPermissions).toHaveBeenCalledTimes(1);
    expect(onKcal).toHaveBeenCalledWith(42);
  });

  it('refreshes every minute in the foreground, not while paused or in the background', async () => {
    const { health, refresher } = setup(async () => 10);
    stop = refresher.stop;
    startActiveWorkout(routine, 'kg', 'u1');
    await vi.advanceTimersByTimeAsync(0);
    health.readActiveEnergyKcal.mockClear();

    await vi.advanceTimersByTimeAsync(60_000);
    expect(health.readActiveEnergyKcal).toHaveBeenCalledTimes(1);

    setActiveWorkout(pauseWorkout(getActiveWorkout()!));
    await vi.advanceTimersByTimeAsync(180_000);
    expect(health.readActiveEnergyKcal).toHaveBeenCalledTimes(1);
  });

  it('stops ticking in the background and reads again on returning', async () => {
    const { health, refresher } = setup(async () => 10);
    stop = refresher.stop;
    startActiveWorkout(routine, 'kg', 'u1');
    await vi.advanceTimersByTimeAsync(0);
    health.readActiveEnergyKcal.mockClear();

    refresher.setForeground(false);
    await vi.advanceTimersByTimeAsync(180_000);
    expect(health.readActiveEnergyKcal).not.toHaveBeenCalled();

    refresher.setForeground(true);
    await vi.advanceTimersByTimeAsync(0);
    expect(health.readActiveEnergyKcal).toHaveBeenCalledTimes(1);
  });

  it('shows unknown for no data, and keeps the last value when a read fails (EF-2, EF-5)', async () => {
    let next: () => Promise<number | null> = async () => 120;
    const { onKcal, refresher } = setup(() => next());
    stop = refresher.stop;
    startActiveWorkout(routine, 'kg', 'u1');
    await vi.advanceTimersByTimeAsync(0);
    expect(onKcal).toHaveBeenLastCalledWith(120);

    next = async () => {
      throw new Error('Protected health data is inaccessible');
    };
    await refresher.refresh();
    expect(onKcal).toHaveBeenCalledTimes(1);

    next = async () => null;
    await refresher.refresh();
    expect(onKcal).toHaveBeenLastCalledWith(null);
  });
});
