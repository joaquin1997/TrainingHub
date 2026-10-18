import type { TFunction } from 'i18next';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { AppState } from 'react-native';

import type { WorkoutSessionDraft } from '@/features/workouts/state/workoutDraftStore';

import { nextSetLabel } from './nextSetLabel';
import { withNotNow } from './notNow';
import { restAlertsForThisDevice, type RestAlertContent } from './restAlerts';
import { deviceKeys, deviceStore } from '@/lib/deviceStore';
import { startRestTimerRunner } from './restTimerRunner';
import { haptics } from '@/ui/haptics';


/** "Rest over" — "Next: {exercise} · set {n}", the set to do now (spec 0029 FR-10). */
function restOverContent(draft: WorkoutSessionDraft, t: TFunction): RestAlertContent {
  const next = nextSetLabel(draft, t);

  return {
    title: t('workouts.restOverTitle'),
    body: next ? t('workouts.restOverBody', { exercise: next }) : t('workouts.restOverBodyGeneric'),
  };
}

/**
 * Runs the rest timer for the whole app (spec 0018), so a rest keeps counting
 * and alerting whichever screen is open. Enabled once the stored workout has
 * been restored (spec 0010), so a rest from the previous run is seen.
 */
export function useRestTimerRunner(enabled: boolean) {
  const { t } = useTranslation();
  // The alert text follows the current language without restarting the runner.
  const tRef = useRef(t);
  tRef.current = t;

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const runner = startRestTimerRunner({
      alerts: withNotNow(
        restAlertsForThisDevice(),
        async () => (await deviceStore.get(deviceKeys.restAlertsNotNow)) === '1',
      ),
      alertContent: (draft) => restOverContent(draft, tRef.current),
      // TODO(sdd): possible double alert in the foreground — iOS does not
      // present a local notification while the app is in front unless a
      // UNUserNotificationCenter delegate asks for it; no installed module is
      // known to set one, but this is unverified; check on the device, and if
      // it shows, have the runner skip the in-app vibration while the alert is
      // scheduled.
      // The haptic language's "rest over" (spec 0034 FR-4); the background
      // notification of 0018 is unchanged.
      vibrate: () => haptics.restOver(),
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
