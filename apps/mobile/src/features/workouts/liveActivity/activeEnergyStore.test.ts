import { describe, expect, it, vi } from 'vitest';

import {
  getActiveEnergyKcal,
  publishActiveEnergy,
  subscribeActiveEnergy,
} from './activeEnergyStore';

describe('activeEnergyStore', () => {
  it('returns the reading of the workout it was published for', () => {
    publishActiveEnergy('workout-a', 312);
    expect(getActiveEnergyKcal('workout-a')).toBe(312);
  });

  it('never hands one workout the calories of another', () => {
    publishActiveEnergy('workout-a', 312);
    expect(getActiveEnergyKcal('workout-b')).toBeNull();
    expect(getActiveEnergyKcal(undefined)).toBeNull();
  });

  it('keeps unknown as null, not 0', () => {
    publishActiveEnergy('workout-a', null);
    expect(getActiveEnergyKcal('workout-a')).toBeNull();
  });

  it('notifies on change only', () => {
    publishActiveEnergy('workout-c', 10);
    const listener = vi.fn();
    const unsubscribe = subscribeActiveEnergy(listener);

    publishActiveEnergy('workout-c', 10);
    expect(listener).not.toHaveBeenCalled();

    publishActiveEnergy('workout-c', 11);
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
    publishActiveEnergy('workout-c', 12);
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
