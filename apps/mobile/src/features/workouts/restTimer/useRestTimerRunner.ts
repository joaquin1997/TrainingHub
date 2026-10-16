import type { TFunction } from 'i18next';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { AppState, Vibration } from 'react-native';

import type { WorkoutSessionDraft } from '@/features/workouts/state/workoutDraftStore';

import { nextSetToDo } from './nextSetToDo';
import { restAlertsForThisDevice, type RestAlertContent } from './restAlerts';
import { startRestTimerRunner } from './restTimerRunner';

const REST_OVER_VIBRATION = [0, 400, 200, 400];

/** "Rest over" — "Next: {exercise}", the exercise of the next set to do. */
function restOverContent(draft: WorkoutSessionDraft, t: TFunction): RestAlertContent {
  const target = draft.rest ? nextSetToDo(draft, draft.rest.workoutExerciseId) : null;
  const exercise = target
    ? draft.exercises.find((item) => item.id === target.workoutExerciseId)
    : undefined;

  return {
    title: t('workouts.restOverTitle'),
    body: exercise
      ? t('workouts.restOverBody', { exercise: exercise.exerciseName })
      : t('workouts.restOverBodyGeneric'),
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
      alerts: restAlertsForThisDevice(),
      alertContent: (draft) => restOverContent(draft, tRef.current),
      // TODO(sdd): possible double alert in the foreground — iOS does not
      // present a local notification while the app is in front unless a
      // UNUserNotificationCenter delegate asks for it; no installed module is
      // known to set one, but this is unverified; check on the device, and if
      // it shows, have the runner skip the in-app vibration while the alert is
      // scheduled.
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
