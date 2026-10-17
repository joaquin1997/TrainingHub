import { describe, expect, it, vi } from 'vitest';

import { createHapticLanguage, type HapticDriver, REST_OVER_GAP_MS } from './hapticLanguage';

function recordingDriver() {
  const calls: string[] = [];
  const driver: HapticDriver = {
    impact: async (style) => {
      calls.push(`impact:${style}`);
    },
    notification: async (type) => {
      calls.push(`notification:${type}`);
    },
  };
  return { calls, driver };
}

describe('haptic language (spec 0034 FR-4, EF-1)', () => {
  it('gives each of the four events its own pattern', () => {
    const { calls, driver } = recordingDriver();
    const scheduled: Array<[() => void, number]> = [];
    const haptics = createHapticLanguage(driver, (run, ms) => scheduled.push([run, ms]));

    haptics.setDone();
    haptics.record();
    haptics.destructiveConfirm();
    haptics.restOver();
    scheduled.forEach(([run]) => run());

    expect(calls).toEqual([
      'impact:light',
      'notification:success',
      'notification:warning',
      'impact:heavy',
      'impact:heavy',
    ]);
    expect(scheduled.map(([, ms]) => ms)).toEqual([REST_OVER_GAP_MS]);
  });

  it('does nothing without a driver (web)', () => {
    const schedule = vi.fn();
    const haptics = createHapticLanguage(null, schedule);

    expect(() => {
      haptics.setDone();
      haptics.record();
      haptics.destructiveConfirm();
      haptics.restOver();
    }).not.toThrow();
  });

  it('never surfaces a driver failure', async () => {
    const haptics = createHapticLanguage(
      {
        impact: () => Promise.reject(new Error('unavailable')),
        notification: () => {
          throw new Error('no native module');
        },
      },
      (run) => run(),
    );

    expect(() => {
      haptics.setDone();
      haptics.record();
      haptics.restOver();
      haptics.destructiveConfirm();
    }).not.toThrow();
    // Let the rejected promises settle: an unhandled rejection would fail the run.
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
});
