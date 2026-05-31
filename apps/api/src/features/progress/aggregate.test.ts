import { describe, expect, it } from 'vitest';

import {
  buildExerciseProgressDetail,
  buildExerciseProgressSummaries,
  buildMuscleGroupVolume,
  buildWeeklyVolume,
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
      {
        date: '2026-05-01T09:00:00.000Z',
        bestWeightKg: 65,
        bestReps: 10,
        totalVolume: 1120,
        estimatedOneRepMax: 82.3,
      },
      {
        date: '2026-05-08T09:00:00.000Z',
        bestWeightKg: 70,
        bestReps: 6,
        totalVolume: 420,
        estimatedOneRepMax: 84,
      },
    ]);
  });

  it('returns null for an unknown exercise', () => {
    expect(buildExerciseProgressDetail(sessions, 'squat')).toBeNull();
  });
});

describe('buildWeeklyVolume', () => {
  it('buckets sessions into Monday-start weeks and sums volume', () => {
    const weekly = buildWeeklyVolume(sessions);

    expect(weekly).toEqual([
      { weekStart: '2026-04-27', totalVolume: 1120, workoutCount: 1 },
      { weekStart: '2026-05-04', totalVolume: 420, workoutCount: 1 },
    ]);
  });

  it('combines multiple workouts in the same week', () => {
    const sameWeek: ProgressSessionInput[] = [
      {
        date: '2026-05-04T09:00:00.000Z', // Monday
        exercises: [
          { exerciseId: 'bench', exerciseName: 'Bench', sets: [{ reps: 5, weightKg: 100 }] },
        ],
      },
      {
        date: '2026-05-07T09:00:00.000Z', // Thursday, same week
        exercises: [
          { exerciseId: 'bench', exerciseName: 'Bench', sets: [{ reps: 5, weightKg: 80 }] },
        ],
      },
    ];

    expect(buildWeeklyVolume(sameWeek)).toEqual([
      { weekStart: '2026-05-04', totalVolume: 900, workoutCount: 2 },
    ]);
  });

  it('keeps only the most recent weeks, oldest-first', () => {
    const many: ProgressSessionInput[] = Array.from({ length: 10 }, (_, index) => ({
      // One session per week starting 2026-01-05 (a Monday).
      date: new Date(Date.UTC(2026, 0, 5 + index * 7)).toISOString(),
      exercises: [
        { exerciseId: 'bench', exerciseName: 'Bench', sets: [{ reps: 1, weightKg: index + 1 }] },
      ],
    }));

    const weekly = buildWeeklyVolume(many, 8);

    expect(weekly).toHaveLength(8);
    expect(weekly[0].totalVolume).toBe(3); // index 2 -> weight 3
    expect(weekly[7].totalVolume).toBe(10); // index 9 -> weight 10
  });
});

describe('buildMuscleGroupVolume', () => {
  const byCategory: ProgressSessionInput[] = [
    {
      date: '2026-05-01T09:00:00.000Z',
      exercises: [
        {
          exerciseId: 'bench',
          exerciseName: 'Bench',
          category: 'Chest',
          sets: [{ reps: 10, weightKg: 60 }], // 600
        },
        {
          exerciseId: 'squat',
          exerciseName: 'Squat',
          category: 'Legs',
          sets: [{ reps: 5, weightKg: 100 }], // 500
        },
      ],
    },
    {
      date: '2026-05-02T09:00:00.000Z',
      exercises: [
        {
          exerciseId: 'pushup',
          exerciseName: 'Push Up',
          category: 'Chest',
          sets: [{ reps: 20, weightKg: 20 }], // 400 -> Chest total 1000
        },
        {
          exerciseId: 'mystery',
          exerciseName: 'Mystery',
          sets: [{ reps: 10, weightKg: 10 }], // 100 -> Other
        },
      ],
    },
  ];

  it('sums volume per category, highest first, with an Other bucket', () => {
    expect(buildMuscleGroupVolume(byCategory)).toEqual([
      { group: 'Chest', totalVolume: 1000 },
      { group: 'Legs', totalVolume: 500 },
      { group: 'Other', totalVolume: 100 },
    ]);
  });

  it('drops groups with zero volume', () => {
    const result = buildMuscleGroupVolume([
      {
        date: '2026-05-01T09:00:00.000Z',
        exercises: [
          { exerciseId: 'a', exerciseName: 'A', category: 'Abs', sets: [{ reps: 20 }] },
        ],
      },
    ]);

    expect(result).toEqual([]);
  });
});

describe('records & estimated 1RM', () => {
  it('flags a new max-weight record on the most recent session', () => {
    const summaries = buildExerciseProgressSummaries(sessions);
    const bench = summaries.find((s) => s.exerciseId === 'bench');

    // session 2 (70kg) beats session 1 (65kg) -> record
    expect(bench?.isRecordSession).toBe(true);
    expect(bench?.bestEstimatedOneRepMax).toBe(84);
  });

  it('does not flag a record when the last session is not a max', () => {
    const cooling: ProgressSessionInput[] = [
      {
        date: '2026-05-01T09:00:00.000Z',
        exercises: [
          { exerciseId: 'bench', exerciseName: 'Bench', sets: [{ reps: 5, weightKg: 100 }] },
        ],
      },
      {
        date: '2026-05-08T09:00:00.000Z',
        exercises: [
          { exerciseId: 'bench', exerciseName: 'Bench', sets: [{ reps: 5, weightKg: 80 }] },
        ],
      },
    ];

    const bench = buildExerciseProgressSummaries(cooling).find(
      (s) => s.exerciseId === 'bench',
    );
    expect(bench?.isRecordSession).toBe(false);
  });
});
