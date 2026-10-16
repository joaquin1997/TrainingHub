import { useEffect } from 'react';
import { AppState, Vibration } from 'react-native';

import { noopRestAlerts } from './restAlerts';
import { startRestTimerRunner } from './restTimerRunner';

const REST_OVER_VIBRATION = [0, 400, 200, 400];

/**
 * Runs the rest timer for the whole app (spec 0018), so a rest keeps counting
 * and alerting whichever screen is open. Enabled once the stored workout has
 * been restored (spec 0010), so a rest from the previous run is seen.
 */
export function useRestTimerRunner(enabled: boolean) {
  useEffect(() => {
    if (!enabled) {
      return;
    }

    const runner = startRestTimerRunner({
      alerts: noopRestAlerts,
      vibrate: () => Vibration.vibrate(REST_OVER_VIBRATION),
      isAppActive: () => AppState.currentState === 'active',
    });
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        runner.check();
      }
    });

    return () => {
      subscription.remove();
      runner.stop();
    };
  }, [enabled]);
}
