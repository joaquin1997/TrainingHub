import type { Routine, WorkoutSession } from '@workout/domain';

import { todaysRoutine } from '@/features/routines/utils/todaysRoutine';
import { isPerformedSet } from '@/features/workouts/utils/performedSet';
import { addDays, sameDay, startOfWeek, weekDays, weekStreak } from '@/lib/week';

/** Texts the widget shows, in the app's language (spec 0036 FR-17). */
export interface HomeWidgetLabels {
  /** "Start {{name}}" with the name already filled in, or empty. */
  start: string;
  setsThisWeek: string;
  streak: string;
  createRoutine: string;
  signIn: string;
  openApp: string;
  paused: string;
  /** Weekday initials, Monday first. */
  weekdays: string[];
}

/** The part read from the server; kept when a later fetch fails (EF-8). */
export interface HomeWidgetHistory {
  weekStartMs: number;
  days: boolean[];
  setsThisWeek: number;
  streak: number;
  weekHadWorkout: boolean;
  today: { id: string; name: string } | null;
  hasRoutines: boolean;
}

export interface HomeWidgetActive {
  routineName: string;
  startedAtMs: number;
  pausedAtMs: number | null;
  pausedSeconds: number;
}

/** What the app hands to the widget. Version 1. */
export interface HomeWidgetSnapshot {
  v: 1;
  signedIn: boolean;
  history: HomeWidgetHistory | null;
  active: HomeWidgetActive | null;
  labels: HomeWidgetLabels;
}

type HistorySession = Pick<WorkoutSession, 'startedAt' | 'routineId' | 'exercises'>;

/**
 * The widget's figures (FR-1 – FR-5): the week streak, performed sets of
 * workouts started this week (warm-ups and timed sets count), the days
 * trained Monday to Sunday, and today's routine (0035). Local time.
 */
export function widgetHistory(
  routines: Routine[],
  sessions: HistorySession[],
  now: Date,
): HomeWidgetHistory {
  const monday = startOfWeek(now);
  const nextMonday = addDays(monday, 7).getTime();
  const starts = sessions.map((session) => new Date(session.startedAt));
  const thisWeek = sessions.filter((session) => {
    const started = Date.parse(session.startedAt);
    return started >= monday.getTime() && started < nextMonday;
  });
  const days = weekDays(now).map((day) =>
    thisWeek.some((session) => sameDay(new Date(session.startedAt), day)),
  );
  const setsThisWeek = thisWeek.reduce(
    (sum, session) =>
      sum +
      session.exercises.reduce(
        (count, exercise) => count + exercise.sets.filter((set) => isPerformedSet(set)).length,
        0,
      ),
    0,
  );
  const today = todaysRoutine(routines, sessions);

  return {
    weekStartMs: monday.getTime(),
    days,
    setsThisWeek,
    streak: weekStreak(starts, now),
    weekHadWorkout: thisWeek.length > 0,
    today: today ? { id: today.id, name: today.name } : null,
    hasRoutines: routines.length > 0,
  };
}

/** The snapshot of a signed-out phone: no figures, no names (EF-1, EF-3). */
export function signedOutSnapshot(labels: HomeWidgetLabels): HomeWidgetSnapshot {
  return { v: 1, signedIn: false, history: null, active: null, labels };
}
