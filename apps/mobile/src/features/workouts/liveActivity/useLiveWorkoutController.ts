import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { AppState, Platform } from 'react-native';

import { setLiveActivityLabels } from '@/features/health/providers/appleHealth';
import { findLiveWorkoutBridge } from '@/features/health/providers';

import { startLiveWorkoutController } from './liveWorkoutController';

/**
 * Runs the live workout status for the whole app (spec 0012). Enabled once the
 * stored workout has been restored (spec 0010), so the first reconcile sees
 * the real active workout. iOS only; elsewhere the bridge is a no-op.
 */
export function useLiveWorkoutController(enabled: boolean) {
  const { t, i18n } = useTranslation();

  useEffect(() => {
    setLiveActivityLabels({
      paused: t('workouts.paused'),
      pause: t('workouts.pause'),
      resume: t('workouts.resume'),
      finish: t('workouts.finish'),
    });
  }, [t, i18n.language]);

  useEffect(() => {
    if (!enabled || Platform.OS !== 'ios') {
      return;
    }

    const bridge = findLiveWorkoutBridge('apple-health');
    if (!bridge) {
      return;
    }

    const controller = startLiveWorkoutController({ bridge });
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void controller.reconcile();
      }
    });

    return () => {
      subscription.remove();
      controller.stop();
    };
  }, [enabled]);
}
