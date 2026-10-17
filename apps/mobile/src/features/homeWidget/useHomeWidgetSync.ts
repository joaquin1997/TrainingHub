import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { AppState, Platform } from 'react-native';

import { routinesClient } from '@/features/routines/api/routinesClient';
import { workoutsClient } from '@/features/workouts/api/workoutsClient';
import {
  getActiveWorkout,
  subscribeActiveWorkout,
  type WorkoutSessionDraft,
} from '@/features/workouts/state/workoutDraftStore';
import { weekDays } from '@/lib/week';

import { homeWidgetBridge } from './bridge';
import {
  signedOutSnapshot,
  widgetHistory,
  type HomeWidgetActive,
  type HomeWidgetHistory,
  type HomeWidgetLabels,
} from './snapshot';

function activeOf(draft: WorkoutSessionDraft | null): HomeWidgetActive | null {
  if (!draft) {
    return null;
  }
  return {
    routineName: draft.routineName,
    startedAtMs: Date.parse(draft.startedAt),
    pausedAtMs: draft.pausedAt ? Date.parse(draft.pausedAt) : null,
    pausedSeconds: draft.pausedSeconds ?? 0,
  };
}

/** What the widget shows of the active workout; a change pushes the widget. */
const activeKey = (draft: WorkoutSessionDraft | null) =>
  draft ? `${draft.clientId}|${draft.pausedAt ?? ''}|${draft.pausedSeconds ?? 0}` : '';

/**
 * Keeps the home-screen widget current (spec 0036 FR-13): on sign-in and
 * sign-out, when the app comes to the foreground or goes to the background,
 * and when a workout starts, pauses, resumes or ends (a saved workout is then
 * fetched). A failed fetch keeps the last figures (EF-8). iOS only.
 */
export function useHomeWidgetSync({
  userId,
  ready,
}: {
  /** The signed-in account, null when signed out. */
  userId: string | null;
  /** False while sign-in state or the stored workout are still loading. */
  ready: boolean;
}) {
  const { t, i18n } = useTranslation();
  const tRef = useRef(t);
  tRef.current = t;
  const lastHistory = useRef<{ userId: string; history: HomeWidgetHistory } | null>(null);

  useEffect(() => {
    if (Platform.OS !== 'ios' || !ready) {
      return;
    }

    const labels = (todayName?: string): HomeWidgetLabels => {
      const translate = tRef.current;
      return {
        start: todayName ? translate('widget.start', { name: todayName }) : '',
        setsThisWeek: translate('widget.setsThisWeek'),
        streak: translate('widget.streak'),
        createRoutine: translate('widget.createRoutine'),
        signIn: translate('widget.signIn'),
        openApp: translate('widget.openApp'),
        paused: translate('workouts.paused'),
        weekdays: weekDays(new Date()).map((day) =>
          day.toLocaleDateString(i18n.language, { weekday: 'narrow' }),
        ),
      };
    };

    if (!userId) {
      // Nothing of the previous account may show (EF-1, EF-3).
      lastHistory.current = null;
      void homeWidgetBridge.push(signedOutSnapshot(labels()));
      return;
    }

    const push = () => {
      const history = lastHistory.current?.userId === userId ? lastHistory.current.history : null;
      void homeWidgetBridge.push({
        v: 1,
        signedIn: true,
        history,
        active: activeOf(getActiveWorkout()),
        labels: labels(history?.today?.name),
      });
    };

    let alive = true;
    const refresh = async () => {
      try {
        const [routines, sessions] = await Promise.all([
          routinesClient.list(),
          workoutsClient.list(),
        ]);
        if (alive) {
          lastHistory.current = { userId, history: widgetHistory(routines, sessions, new Date()) };
        }
      } catch {
        // Offline or a server error: the last figures stay (EF-8).
      }
      if (alive) {
        push();
      }
    };

    void refresh();

    let shown = activeKey(getActiveWorkout());
    const unsubscribe = subscribeActiveWorkout(() => {
      const draft = getActiveWorkout();
      const next = activeKey(draft);
      if (next === shown) {
        return;
      }
      const ended = shown !== '' && !draft;
      shown = next;
      // A workout that ended may have been saved: fetch its figures (FR-8).
      if (ended) {
        void refresh();
      } else {
        push();
      }
    });
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active' || state === 'background') {
        void refresh();
      }
    });

    return () => {
      alive = false;
      unsubscribe();
      subscription.remove();
    };
  }, [userId, ready, i18n.language]);
}
