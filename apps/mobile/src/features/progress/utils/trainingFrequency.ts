import type { WeeklyVolumePoint } from '@workout/domain';

export interface TrainingFrequencySummary {
  /** Total workouts across the recorded weeks. */
  totalWorkouts: number;
  /** Number of weeks that had at least one workout. */
  activeWeeks: number;
  /** Most workouts done in a single week. */
  bestWeek: number;
  /** Trailing run of calendar-consecutive weeks ending at the most recent one. */
  currentStreak: number;
}

const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000;

function weeksApart(earlier: string, later: string): number {
  const a = new Date(`${earlier}T00:00:00.000Z`).getTime();
  const b = new Date(`${later}T00:00:00.000Z`).getTime();
  return Math.round((b - a) / MS_PER_WEEK);
}

/**
 * Summarizes training frequency from the weekly-volume points (oldest-first,
 * only weeks that had workouts). The streak counts how many calendar-consecutive
 * weeks lead up to the most recent recorded week.
 */
export function summarizeTrainingFrequency(
  points: WeeklyVolumePoint[],
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

  return {
    totalWorkouts,
    activeWeeks: points.length,
    bestWeek,
    currentStreak,
  };
}
