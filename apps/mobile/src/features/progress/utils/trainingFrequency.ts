import type { WeeklyVolumePoint } from '@workout/domain';

import { startOfWeek } from '@/lib/week';

export interface TrainingFrequencySummary {
  /** Total workouts across the recorded weeks. */
  totalWorkouts: number;
  /** Number of weeks that had at least one workout. */
  activeWeeks: number;
  /** Most workouts done in a single week. */
  bestWeek: number;
  /**
   * The week streak (spec 0035): consecutive weeks ending this week, or last
   * week while this week has none; 0 when the latest run ended before that.
   */
  currentStreak: number;
}

const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000;

function weeksApart(earlier: string, later: string): number {
  const a = new Date(`${earlier}T00:00:00.000Z`).getTime();
  const b = new Date(`${later}T00:00:00.000Z`).getTime();
  return Math.round((b - a) / MS_PER_WEEK);
}

/** `YYYY-MM-DD` of a local date. */
function isoDay(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

/**
 * Summarizes training frequency from the weekly-volume points (oldest-first,
 * only weeks that had workouts). The streak counts the calendar-consecutive
 * weeks leading up to the most recent recorded week, provided that week is
 * this week or last week (spec 0035 FR-4); screens with the saved workouts
 * at hand use `weekStreak` from `lib/week` instead, which agrees.
 */
export function summarizeTrainingFrequency(
  points: WeeklyVolumePoint[],
  now: Date = new Date(),
): TrainingFrequencySummary {
  if (points.length === 0) {
    return { totalWorkouts: 0, activeWeeks: 0, bestWeek: 0, currentStreak: 0 };
  }

  const totalWorkouts = points.reduce((sum, point) => sum + point.workoutCount, 0);
  const bestWeek = Math.max(...points.map((point) => point.workoutCount));

  let currentStreak = 1;
  for (let i = points.length - 1; i > 0; i -= 1) {
    if (weeksApart(points[i - 1]!.weekStart, points[i]!.weekStart) === 1) {
      currentStreak += 1;
    } else {
      break;
    }
  }

  // An old run is not current: the latest week must be this one or the last.
  const latest = points[points.length - 1]!.weekStart;
  const thisWeek = isoDay(startOfWeek(now));
  if (weeksApart(latest, thisWeek) > 1) {
    currentStreak = 0;
  }

  return {
    totalWorkouts,
    activeWeeks: points.length,
    bestWeek,
    currentStreak,
  };
}
