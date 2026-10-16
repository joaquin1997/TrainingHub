import { describe, expect, it } from 'vitest';

import { extractMetricRecords, extractPersonalRecords } from './personalRecords';
import type { ExerciseProgressPoint } from '@workout/domain';

function point(
  date: string,
  values: Partial<ExerciseProgressPoint>,
): ExerciseProgressPoint {
  return { date, totalVolume: 0, ...values };
}

describe('extractPersonalRecords', () => {
  it('returns a record only when the max weight is beaten', () => {
    const records = extractPersonalRecords([
      point('2026-01-01', { bestWeightKg: 60, bestReps: 8 }),
      point('2026-01-08', { bestWeightKg: 60, bestReps: 10 }), // tie, not a PR
      point('2026-01-15', { bestWeightKg: 65, bestReps: 6 }), // PR
      point('2026-01-22', { bestWeightKg: 62 }), // below best, not a PR
    ]);

    expect(records.map((r) => ({ date: r.date, weightKg: r.weightKg }))).toEqual([
      { date: '2026-01-01', weightKg: 60 },
      { date: '2026-01-15', weightKg: 65 },
    ]);
  });

  it('carries reps and estimated 1RM onto the record', () => {
    const records = extractPersonalRecords([
      point('2026-01-01', { bestWeightKg: 100, bestReps: 5, estimatedOneRepMax: 116.7 }),
    ]);

    expect(records[0]).toEqual({
      date: '2026-01-01',
      weightKg: 100,
      reps: 5,
      estimatedOneRepMax: 116.7,
    });
  });

  it('ignores bodyweight points with no weight', () => {
    const records = extractPersonalRecords([
      point('2026-01-01', { bestReps: 12 }),
      point('2026-01-08', { bestReps: 15 }),
    ]);

    expect(records).toHaveLength(0);
  });
});

describe('extractMetricRecords (spec 0021)', () => {
  it('keeps the sessions that set a new longest time', () => {
    expect(
      extractMetricRecords(
        [
          point('2026-01-01', { bestDurationSeconds: 45 }),
          point('2026-01-08', { bestDurationSeconds: 45 }),
          point('2026-01-15', { bestDurationSeconds: 60 }),
          point('2026-01-22', {}),
        ],
        'bestDurationSeconds',
      ),
    ).toEqual([
      { date: '2026-01-01', value: 45 },
      { date: '2026-01-15', value: 60 },
    ]);
  });
});
