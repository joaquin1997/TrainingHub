import { describe, expect, it } from 'vitest';

import {
  buildExerciseProgressDetail,
  buildExerciseProgressSummaries,
  type ProgressSessionInput,
} from './aggregate.js';

const sessions: ProgressSessionInput[] = [
  {
    date: '2026-05-01T09:00:00.000Z',
    exercises: [
      {
        exerciseId: 'bench',
        exerciseName: 'Bench Press',
        sets: [
          { reps: 10, weightKg: 60 },
          { reps: 8, weightKg: 65 },
        ],
      },
    ],
  },
  {
    date: '2026-05-08T09:00:00.000Z',
    exercises: [
      {
        exerciseId: 'bench',
        exerciseName: 'Bench Press',
        sets: [{ reps: 6, weightKg: 70 }],
      },
      {
        exerciseId: 'pullup',
        exerciseName: 'Pull Up',
        sets: [{ reps: 12, weightKg: null }],
      },
    ],
  },
];

describe('buildExerciseProgressSummaries', () => {
  it('aggregates per exercise with latest and personal best', () => {
    const summaries = buildExerciseProgressSummaries(sessions);
    const bench = summaries.find((summary) => summary.exerciseId === 'bench');

    expect(bench).toMatchObject({
      exerciseName: 'Bench Press',
      sessionCount: 2,
      lastPerformedAt: '2026-05-08T09:00:00.000Z',
      latestWeightKg: 70,
      latestReps: 6,
      personalBestWeightKg: 70,
      personalBestReps: 10,
    });
  });

  it('handles bodyweight sets (no weight) with undefined weight', () => {
    const summaries = buildExerciseProgressSummaries(sessions);
    const pullup = summaries.find((summary) => summary.exerciseId === 'pullup');

    expect(pullup).toMatchObject({
      sessionCount: 1,
      latestReps: 12,
      personalBestWeightKg: undefined,
    });
  });

  it('orders summaries by most recently performed first', () => {
    const summaries = buildExerciseProgressSummaries(sessions);
    expect(summaries[0]?.lastPerformedAt).toBe('2026-05-08T09:00:00.000Z');
  });

  it('is order-independent (sorts sessions chronologically)', () => {
    const reversed = [...sessions].reverse();
    const summaries = buildExerciseProgressSummaries(reversed);
    const bench = summaries.find((summary) => summary.exerciseId === 'bench');

    expect(bench?.latestWeightKg).toBe(70);
  });
});

describe('buildExerciseProgressDetail', () => {
  it('returns points with per-session best and total volume', () => {
    const detail = buildExerciseProgressDetail(sessions, 'bench');

    expect(detail?.points).toEqual([
      { date: '2026-05-01T09:00:00.000Z', bestWeightKg: 65, bestReps: 10, totalVolume: 1120 },
      { date: '2026-05-08T09:00:00.000Z', bestWeightKg: 70, bestReps: 6, totalVolume: 420 },
    ]);
  });

  it('returns null for an unknown exercise', () => {
    expect(buildExerciseProgressDetail(sessions, 'squat')).toBeNull();
  });
});
