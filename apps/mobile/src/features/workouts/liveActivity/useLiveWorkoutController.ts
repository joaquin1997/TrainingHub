import { useRouter } from 'expo-router';
import i18n from '@/i18n';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { AppState, Platform } from 'react-native';

import { setLiveActivityLabels } from '@/features/health/providers/appleHealth';
import { setWatchLabels } from '@/features/health/providers/appleWatch';
import {
  findHealthIntegration,
  findLiveWorkoutBridge,
  findWatchWorkoutBridge,
} from '@/features/health/providers';
import { useSettings } from '@/features/settings/SettingsContext';
import { startWatchWorkoutController } from '@/features/workouts/watch/watchWorkoutController';
import {
  clearActiveWorkout,
  getActiveWorkout,
  subscribeActiveWorkout,
} from '@/features/workouts/state/workoutDraftStore';
import { haptics } from '@/ui/haptics';

import { startActiveEnergyRefresher } from './activeEnergyRefresher';
import { publishActiveEnergy } from './activeEnergyStore';
import { createKcalSources } from './kcalSources';

import { startLiveWorkoutController } from './liveWorkoutController';
import { liveUpNext } from './liveWorkoutPayload';

/**
 * Runs the live workout status for the whole app (spec 0012) and the workout
 * on the watch (spec 0025). Enabled once the stored workout has been restored
 * (spec 0010), so the first reconcile sees the real active workout. iOS only;
 * elsewhere the bridges are no-ops.
 */
export function useLiveWorkoutController(enabled: boolean) {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { settings } = useSettings();
  // Read when a set is ticked on the watch, without restarting the controllers.
  const defaultRestRef = useRef(settings.defaultRestSeconds);
  defaultRestRef.current = settings.defaultRestSeconds;
  const routerRef = useRef(router);
  routerRef.current = router;

  useEffect(() => {
    setLiveActivityLabels({
      paused: t('workouts.paused'),
      pause: t('workouts.pause'),
      resume: t('workouts.resume'),
      finish: t('workouts.finish'),
      discard: t('workouts.liveDiscard'),
      next: t('workouts.liveNext'),
      allDone: t('workouts.liveAllDone'),
      setsDone: (done, total) => t('workouts.liveSetsDone', { done, total }),
    });
    setWatchLabels({
      done: t('workouts.watchDone'),
      pause: t('workouts.pause'),
      resume: t('workouts.resume'),
      finish: t('workouts.finish'),
      rest: t('workouts.watchRest'),
      paused: t('workouts.paused'),
      finishOnPhone: t('workouts.watchFinishOnPhone'),
      allDone: t('workouts.watchAllDone'),
      waiting: t('workouts.watchWaiting'),
      setOf: (number, count, isWarmup) =>
        t(isWarmup ? 'workouts.watchWarmUpOf' : 'workouts.watchSetOf', { number, count }),
      more: t('workouts.watchMore'),
      discard: t('workouts.liveDiscard'),
      discardTitle: t('workouts.discardTitle'),
      cancel: t('common.cancel'),
      connectToDiscard: t('workouts.watchConnectToDiscard'),
      discardLost: (count) =>
        count > 0 ? t('workouts.discardLost', { count }) : t('workouts.discardNoneDone'),
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

    const controller = startLiveWorkoutController({
      bridge,
      upNext: (draft) =>
        liveUpNext(draft, (round) => i18n.t('workouts.liveRound', { round })),
    });
    // The phone's Health reading until the watch measures the workout (0025).
    const kcal = createKcalSources((clientId, value) => {
      controller.setActiveEnergyKcal(value);
      // The same reading, for the active workout screen (spec 0017).
      publishActiveEnergy(clientId, value);
    });
    const health = findHealthIntegration('apple-health');
    const energy = health
      ? startActiveEnergyRefresher({
          health,
          store: { get: getActiveWorkout, subscribe: subscribeActiveWorkout },
          onKcal: (value) => kcal.fromPhone(getActiveWorkout()?.clientId, value),
        })
      : null;
    const watchBridge = findWatchWorkoutBridge('apple-health');
    const watch = watchBridge
      ? startWatchWorkoutController({
          bridge: watchBridge,
          defaultRestSeconds: () => defaultRestRef.current,
          onActiveEnergy: kcal.fromWatch,
          // Finishing is confirmed on the phone, as from the lock screen.
          onFinishRequested: () => {
            routerRef.current.navigate('/workouts/active?action=finish');
          },
          // Confirmed on the watch (spec 0035 FR-22): discard as from the
          // app, which also ends the watch workout without saving to Health.
          onDiscardRequested: () => {
            haptics.destructiveConfirm();
            clearActiveWorkout();
            routerRef.current.navigate('/routines');
          },
        })
      : null;
    const subscription = AppState.addEventListener('change', (state) => {
      const active = state === 'active';
      energy?.setForeground(active);
      if (active) {
        void controller.reconcile();
      }
    });

    return () => {
      subscription.remove();
      watch?.stop();
      energy?.stop();
      controller.stop();
    };
  }, [enabled]);
}
