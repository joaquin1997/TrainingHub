import { describe, expect, it } from 'vitest';

import {
  buildExerciseProgressDetail,
  buildExerciseProgressSummaries,
  buildMuscleGroupVolume,
  buildWeeklyVolume,
  selectPerformedWork,
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

describe('performed work only (spec 0013)', () => {
  const done = '2026-06-01T10:00:00.000Z';

  it('ignores sets not marked done, even when they carry values (AC-1, AC-5)', () => {
    const input: ProgressSessionInput[] = [
      {
        date: '2026-06-01T10:30:00.000Z',
        exercises: [
          {
            exerciseId: 'bench',
            exerciseName: 'Bench',
            sets: [
              { reps: 5, weightKg: 80, completedAt: done },
              { reps: 5, weightKg: 100, completedAt: null },
              { reps: 5, weightKg: 100, completedAt: null },
              { reps: 5, weightKg: 100, completedAt: null },
            ],
          },
        ],
      },
    ];

    const detail = buildExerciseProgressDetail(selectPerformedWork(input), 'bench');

    expect(detail?.points).toEqual([
      {
        date: '2026-06-01T10:30:00.000Z',
        bestWeightKg: 80,
        bestReps: 5,
        totalVolume: 400,
        estimatedOneRepMax: 93.3,
      },
    ]);
  });

  it('drops exercises with no performed set from the session', () => {
    const performed = selectPerformedWork([
      {
        date: done,
        exercises: [
          { exerciseId: 'bench', exerciseName: 'Bench', sets: [{ reps: 5, weightKg: 80, completedAt: done }] },
          { exerciseId: 'row', exerciseName: 'Row', sets: [{ reps: 5, weightKg: 60, completedAt: null }] },
        ],
      },
    ]);

    expect(performed[0]?.exercises.map((exercise) => exercise.exerciseId)).toEqual([
      'bench',
    ]);
  });

  it('treats every set of a legacy session as performed (AC-4)', () => {
    const performed = selectPerformedWork([
      {
        date: '2026-05-30T08:00:00.000Z',
        exercises: [
          {
            exerciseId: 'bench',
            exerciseName: 'Bench',
            sets: [
              { reps: 10, weightKg: 60 },
              { reps: 8, weightKg: 65 },
            ],
          },
        ],
      },
    ]);

    expect(performed[0]?.exercises[0]?.sets).toHaveLength(2);
  });

  it('keeps warmups out of records and 1RM but in volume (AC-3)', () => {
    const input = selectPerformedWork([
      {
        date: '2026-05-01T09:00:00.000Z',
        exercises: [
          {
            exerciseId: 'bench',
            exerciseName: 'Bench',
            category: 'Chest',
            sets: [{ reps: 5, weightKg: 100, completedAt: done }],
          },
        ],
      },
      {
        date: '2026-05-08T09:00:00.000Z',
        exercises: [
          {
            exerciseId: 'bench',
            exerciseName: 'Bench',
            category: 'Chest',
            sets: [
              { reps: 3, weightKg: 110, completedAt: done, type: 'warmup' },
              { reps: 5, weightKg: 90, completedAt: done, type: 'normal' },
            ],
          },
        ],
      },
    ]);

    const bench = buildExerciseProgressSummaries(input).find(
      (summary) => summary.exerciseId === 'bench',
    );
    expect(bench?.isRecordSession).toBe(false);
    expect(bench?.personalBestWeightKg).toBe(100);
    expect(bench?.latestWeightKg).toBe(90);

    // 330 (warmup) + 450 in the second week; 500 in the first.
    expect(buildWeeklyVolume(input).map((week) => week.totalVolume)).toEqual([
      500, 780,
    ]);
    expect(buildMuscleGroupVolume(input)).toEqual([
      { group: 'Chest', totalVolume: 1280 },
    ]);
  });

  it('recognises warmups flagged the older way', () => {
    const detail = buildExerciseProgressDetail(
      selectPerformedWork([
        {
          date: done,
          exercises: [
            {
              exerciseId: 'bench',
              exerciseName: 'Bench',
              sets: [
                { reps: 3, weightKg: 110, completedAt: done, isWarmup: true },
                { reps: 5, weightKg: 90, completedAt: done },
              ],
            },
          ],
        },
      ]),
      'bench',
    );

    expect(detail?.points[0]?.bestWeightKg).toBe(90);
  });

  it('a warmup-only session adds volume without touching the records (EF-1)', () => {
    const input = selectPerformedWork([
      {
        date: '2026-05-01T09:00:00.000Z',
        exercises: [
          { exerciseId: 'bench', exerciseName: 'Bench', sets: [{ reps: 5, weightKg: 100, completedAt: done }] },
        ],
      },
      {
        date: '2026-05-08T09:00:00.000Z',
        exercises: [
          {
            exerciseId: 'bench',
            exerciseName: 'Bench',
            sets: [{ reps: 5, weightKg: 120, completedAt: done, type: 'warmup' }],
          },
        ],
      },
    ]);

    const detail = buildExerciseProgressDetail(input, 'bench');

    expect(detail?.points[1]).toEqual({
      date: '2026-05-08T09:00:00.000Z',
      bestWeightKg: undefined,
      bestReps: undefined,
      totalVolume: 600,
      estimatedOneRepMax: undefined,
    });
    expect(detail?.personalBestWeightKg).toBe(100);
    expect(detail?.bestEstimatedOneRepMax).toBe(116.7);
    expect(detail?.isRecordSession).toBe(false);
  });
});

describe('time and distance (spec 0021)', () => {
  const plank = (date: string, seconds: number[]): ProgressSessionInput => ({
    date,
    exercises: [
      {
        exerciseId: 'plank',
        exerciseName: 'Plank',
        trackingType: 'duration',
        sets: seconds.map((durationSeconds) => ({ durationSeconds })),
      },
    ],
  });

  it('keeps the longest time per session and overall, with no volume (FR-5)', () => {
    const detail = buildExerciseProgressDetail(
      [plank('2026-05-01T09:00:00.000Z', [45, 60]), plank('2026-05-08T09:00:00.000Z', [50])],
      'plank',
    );

    expect(detail?.points.map((point) => point.bestDurationSeconds)).toEqual([60, 50]);
    expect(detail?.points.map((point) => point.totalVolume)).toEqual([0, 0]);
    expect(detail).toMatchObject({
      trackingType: 'duration',
      latestDurationSeconds: 50,
      personalBestDurationSeconds: 60,
      isRecordSession: false,
    });
  });

  it('a longer time is the record of a timed exercise (FR-6)', () => {
    const [summary] = buildExerciseProgressSummaries([
      plank('2026-05-01T09:00:00.000Z', [45]),
      plank('2026-05-08T09:00:00.000Z', [70]),
    ]);

    expect(summary?.isRecordSession).toBe(true);
  });

  it('weight & time records the longest time, not the heaviest weight', () => {
    const carry = (date: string, weightKg: number, durationSeconds: number) => ({
      date,
      exercises: [
        {
          exerciseId: 'carry',
          exerciseName: 'Carry',
          trackingType: 'weight_duration' as const,
          sets: [{ weightKg, durationSeconds }],
        },
      ],
    });
    const [summary] = buildExerciseProgressSummaries([
      carry('2026-05-01T09:00:00.000Z', 24, 60),
      carry('2026-05-08T09:00:00.000Z', 32, 40),
    ]);

    expect(summary?.isRecordSession).toBe(false);
    expect(buildWeeklyVolume([carry('2026-05-08T09:00:00.000Z', 32, 40)])[0]?.totalVolume).toBe(0);
  });

  it('a longer distance is the record of a distance exercise', () => {
    const row = (date: string, distanceMeters: number) => ({
      date,
      exercises: [
        {
          exerciseId: 'row',
          exerciseName: 'Rowing Machine',
          trackingType: 'distance_duration' as const,
          sets: [{ distanceMeters, durationSeconds: 105 }],
        },
      ],
    });
    const [summary] = buildExerciseProgressSummaries([
      row('2026-05-01T09:00:00.000Z', 500),
      row('2026-05-08T09:00:00.000Z', 1000),
    ]);

    expect(summary).toMatchObject({
      isRecordSession: true,
      latestDistanceMeters: 1000,
      personalBestDistanceMeters: 1000,
    });
  });
});
