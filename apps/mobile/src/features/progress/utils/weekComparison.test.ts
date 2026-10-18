import { describe, expect, it } from 'vitest';
import type { SessionRecords, WorkoutSession } from '@workout/domain';

import { latestRecord, weekVolumeComparison } from './weekComparison';

const local = (month: number, day: number, hour = 12) => new Date(2026, month - 1, day, hour);

/** A saved workout with one performed set of `volumeKg` (1 rep). */
function session(start: Date, volumeKg: number): Pick<WorkoutSession, 'startedAt' | 'exercises'> {
  return {
    startedAt: start.toISOString(),
    exercises: [
      {
        sets: [{ reps: 1, weightKg: volumeKg, performed: true }],
      },
    ] as unknown as WorkoutSession['exercises'],
  };
}

// Thursday 2026-10-15, 18:00.
const now = local(10, 15, 18);

describe('weekVolumeComparison', () => {
  it('compares this week with last week up to the same point (AC-6)', () => {
    const result = weekVolumeComparison(
      [
        session(local(10, 13), 8000), // this Tuesday
        session(local(10, 6), 6500), // last Tuesday
        session(local(10, 9), 3700), // last Friday: after this point
      ],
      now,
    );
    expect(result).toEqual({
      thisWeekKg: 8000,
      lastWeekToDateKg: 6500,
      lastWeekTotalKg: 10200,
      hasLastWeek: true,
    });
  });

  it('has no comparison without a workout last week', () => {
    const result = weekVolumeComparison([session(local(10, 13), 500), session(local(9, 29), 900)], now);
    expect(result.hasLastWeek).toBe(false);
    expect(result.thisWeekKg).toBe(500);
  });

  it('counts last Thursday before 18:00 as up to the same point', () => {
    const result = weekVolumeComparison([session(local(10, 8, 17), 100), session(local(10, 8, 19), 50)], now);
    expect(result.lastWeekToDateKg).toBe(100);
    expect(result.lastWeekTotalKg).toBe(150);
  });
});

describe('latestRecord', () => {
  const record = (type: SessionRecords['records'][number]['type'], date: string) => ({
    type,
    value: 100,
    date,
    exerciseId: 'bench',
    exerciseName: 'Bench press',
  });

  it('is null when no workout beat a record', () => {
    expect(latestRecord([])).toBeNull();
    expect(latestRecord([{ workoutId: 'w', records: [] }])).toBeNull();
  });

  it('picks the newest workout and its first record in display order', () => {
    const result = latestRecord([
      { workoutId: 'old', records: [record('heaviestWeight', '2026-10-01T10:00:00.000Z')] },
      {
        workoutId: 'new',
        records: [
          record('bestSetVolume', '2026-10-13T10:00:00.000Z'),
          record('heaviestWeight', '2026-10-13T10:00:00.000Z'),
        ],
      },
    ]);
    expect(result?.type).toBe('heaviestWeight');
    expect(result?.date).toBe('2026-10-13T10:00:00.000Z');
  });
});
