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
  // Spec 0041; optional so an older widget still decodes the snapshot.
  /** "Today" above today's routine. */
  today?: string;
  /** "Next" before the set to do. */
  next?: string;
  rest?: string;
  allDone?: string;
  /** "6 exercises" for today's routine, already counted. */
  exerciseCount?: string;
  /** "Last time" before when today's routine was last done. */
  lastTime?: string;
  /** "First time" when it was never done. */
  firstTime?: string;
  /** "workouts" after the week's count. */
  workoutsThisWeek?: string;
  /** "sets" after the sets done, e.g. "9/20 sets". */
  sets?: string;
  /** "+2 more" under a cut list, with "#" replaced by the widget. */
  more?: string;
  /** "No routine yet" when there is no routine for today. */
  noRoutine?: string;
}

/** The part read from the server; kept when a later fetch fails (EF-8). */
export interface HomeWidgetHistory {
  weekStartMs: number;
  days: boolean[];
  setsThisWeek: number;
  streak: number;
  weekHadWorkout: boolean;
  today: {
    id: string;
    name: string;
    /** Spec 0041: its exercises in order (names), and when it was last done. */
    exercises?: string[];
    lastDoneMs?: number | null;
  } | null;
  hasRoutines: boolean;
  /** Spec 0041: workouts started this week. */
  workoutsThisWeek?: number;
}

export interface HomeWidgetActive {
  routineName: string;
  startedAtMs: number;
  pausedAtMs: number | null;
  pausedSeconds: number;
  // Spec 0041 FR-6.
  setsDone?: number;
  setsTotal?: number;
  /** The set to do, e.g. "Press inclinado · 32.5 kg × 10"; null when all are done. */
  upNext?: string | null;
  /** End of the running rest, while it is ahead. */
  restEndsAtMs?: number | null;
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
  // Sessions are newest first (as the API lists them): the first match is the last time.
  const lastDone = today ? sessions.find((session) => session.routineId === today.id) : undefined;

  return {
    weekStartMs: monday.getTime(),
    days,
    setsThisWeek,
    streak: weekStreak(starts, now),
    weekHadWorkout: thisWeek.length > 0,
    today: today
      ? {
          id: today.id,
          name: today.name,
          exercises: today.exercises
            .slice()
            .sort((left, right) => left.orderIndex - right.orderIndex)
            .map((exercise) => exercise.exerciseName),
          lastDoneMs: lastDone ? Date.parse(lastDone.startedAt) : null,
        }
      : null,
    hasRoutines: routines.length > 0,
    workoutsThisWeek: thisWeek.length,
  };
}

/** The snapshot of a signed-out phone: no figures, no names (EF-1, EF-3). */
export function signedOutSnapshot(labels: HomeWidgetLabels): HomeWidgetSnapshot {
  return { v: 1, signedIn: false, history: null, active: null, labels };
}
