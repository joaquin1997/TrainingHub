import { subscribeWorkoutInvalidation } from '../workouts/corrections/workoutInvalidation';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { AppState, Platform } from 'react-native';

import { routinesClient } from '@/features/routines/api/routinesClient';
import { workoutsClient } from '@/features/workouts/api/workoutsClient';
import { liveUpNext } from '@/features/workouts/liveActivity/liveWorkoutPayload';
import {
  countWorkoutSets,
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

type RoundLabel = (round: number) => string;

function activeOf(draft: WorkoutSessionDraft | null, roundLabel: RoundLabel): HomeWidgetActive | null {
  if (!draft) {
    return null;
  }
  const sets = countWorkoutSets(draft);
  const restEndsAtMs = draft.rest ? Date.parse(draft.rest.endsAt) : null;
  return {
    routineName: draft.routineName,
    startedAtMs: Date.parse(draft.startedAt),
    pausedAtMs: draft.pausedAt ? Date.parse(draft.pausedAt) : null,
    pausedSeconds: draft.pausedSeconds ?? 0,
    // Spec 0041 FR-6: progress, the set to do and the rest while it is ahead.
    setsDone: sets.done,
    setsTotal: sets.total,
    upNext: liveUpNext(draft, roundLabel),
    restEndsAtMs: restEndsAtMs !== null && restEndsAtMs > Date.now() ? restEndsAtMs : null,
  };
}

/**
 * What the widget shows of the active workout; a change pushes the widget —
 * a tick, an untick, a rest started or skipped, a pause (spec 0041 FR-8).
 */
const activeKey = (draft: WorkoutSessionDraft | null, roundLabel: RoundLabel) => {
  if (!draft) {
    return '';
  }
  const active = activeOf(draft, roundLabel)!;
  return [
    draft.clientId,
    draft.pausedAt ?? '',
    draft.pausedSeconds ?? 0,
    active.setsDone,
    active.setsTotal,
    active.upNext ?? '',
    draft.rest?.endsAt ?? '',
  ].join('|');
};

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

    const labels = (todayName?: string, todayExercises?: number): HomeWidgetLabels => {
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
        today: translate('widget.today'),
        next: translate('widget.next'),
        rest: translate('widget.rest'),
        allDone: translate('widget.allDone'),
        exerciseCount: translate('widget.exerciseCount', { count: todayExercises ?? 0 }),
        lastTime: translate('widget.lastTime'),
        firstTime: translate('widget.firstTime'),
        workoutsThisWeek: translate('widget.workoutsThisWeek'),
        sets: translate('widget.sets'),
        // The widget puts the count in place of '#'.
        more: translate('widget.more', { n: '#' }),
        noRoutine: translate('widget.noRoutine'),
      };
    };
    const roundLabel: RoundLabel = (round) => tRef.current('workouts.liveRound', { round });

    if (!userId) {
      // Nothing of the previous account may show (EF-1, EF-3).
      lastHistory.current = null;
      void homeWidgetBridge.push(signedOutSnapshot(labels()));
      return;
    }

    let correctionStale = false;
    let generation = 0;
    const push = () => {
      const history = lastHistory.current?.userId === userId ? lastHistory.current.history : null;
      void homeWidgetBridge.push({
        v: 1,
        signedIn: true,
        history,
        active: activeOf(getActiveWorkout(), roundLabel),
        labels: { ...labels(history?.today?.name, history?.today?.exercises?.length),
          ...(correctionStale ? { openApp: tRef.current('workouts.correction.refreshFailed') } : {}),
        },
      });
    };

    let alive = true;
    const refresh = async () => {
      const request = ++generation;
      try {
        const [routines, sessions] = await Promise.all([
          routinesClient.list(),
          workoutsClient.list(),
        ]);
        if (alive && request === generation) {
          correctionStale = false;
          lastHistory.current = { userId, history: widgetHistory(routines, sessions, new Date()) };
        }
      } catch {
        // Offline or a server error: the last figures stay (EF-8).
      }
      if (alive && request === generation) {
        push();
      }
    };

    void refresh();
    const unsubscribeCorrections = subscribeWorkoutInvalidation((event) => {
      if (event.ownerId !== userId) return;
      generation += 1;
      correctionStale = true;
      lastHistory.current = null;
      push();
      void refresh();
    });

    let shown = activeKey(getActiveWorkout(), roundLabel);
    const unsubscribe = subscribeActiveWorkout(() => {
      const draft = getActiveWorkout();
      const next = activeKey(draft, roundLabel);
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
      unsubscribeCorrections();
      unsubscribe();
      subscription.remove();
    };
  }, [userId, ready, i18n.language]);
}
