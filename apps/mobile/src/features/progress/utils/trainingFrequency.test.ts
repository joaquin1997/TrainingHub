import { describe, expect, it } from 'vitest';

import { summarizeTrainingFrequency } from './trainingFrequency';
import type { WeeklyVolumePoint } from '@workout/domain';

function week(weekStart: string, workoutCount: number): WeeklyVolumePoint {
  return { weekStart, workoutCount, totalVolume: workoutCount * 100 };
}

// Wednesday 2026-05-20, local time: this week starts Monday 05-18.
const may20 = new Date(2026, 4, 20, 12);

describe('summarizeTrainingFrequency', () => {
  it('returns zeroes for no data', () => {
    expect(summarizeTrainingFrequency([])).toEqual({
      totalWorkouts: 0,
      activeWeeks: 0,
      bestWeek: 0,
      currentStreak: 0,
    });
  });

  it('totals workouts, active weeks and the best week', () => {
    const summary = summarizeTrainingFrequency([
      week('2026-05-04', 2),
      week('2026-05-11', 4),
      week('2026-05-18', 3),
    ]);

    expect(summary.totalWorkouts).toBe(9);
    expect(summary.activeWeeks).toBe(3);
    expect(summary.bestWeek).toBe(4);
  });

  it('counts the trailing streak of consecutive weeks', () => {
    // 05-04, 05-11, 05-18 are consecutive -> streak 3.
    expect(
      summarizeTrainingFrequency([
        week('2026-05-04', 1),
        week('2026-05-11', 1),
        week('2026-05-18', 1),
      ], may20).currentStreak,
    ).toBe(3);
  });

  it('breaks the streak on a gap week', () => {
    // gap between 05-04 and 05-18 (two weeks apart) -> only the last week counts.
    expect(
      summarizeTrainingFrequency([
        week('2026-04-27', 1),
        week('2026-05-04', 1),
        week('2026-05-18', 1),
      ], may20).currentStreak,
    ).toBe(1);
  });

  it('keeps a run that ended last week (spec 0035)', () => {
    expect(
      summarizeTrainingFrequency([week('2026-05-04', 1), week('2026-05-11', 1)], may20)
        .currentStreak,
    ).toBe(2);
  });

  it('shows no streak once a whole week passed without a workout (spec 0035 AC-2)', () => {
    expect(
      summarizeTrainingFrequency([week('2026-04-20', 1), week('2026-04-27', 1)], may20)
        .currentStreak,
    ).toBe(0);
  });
});
