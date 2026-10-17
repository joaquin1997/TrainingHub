import { describe, expect, it } from 'vitest';

import {
  buildExerciseProgressDetail,
  buildSessionRecords,
  recordValuesOf,
  type ProgressSessionInput,
} from './aggregate.js';

describe('reclassified exercises (spec 0030 FR-17)', () => {
  const plank = (
    date: string,
    trackingType: 'duration' | undefined,
    sets: Array<{ weightKg?: number; reps?: number; durationSeconds?: number }>,
  ): ProgressSessionInput => ({
    date,
    workoutId: date,
    exercises: [{ exerciseId: 'plank', exerciseName: 'Plancha', trackingType, sets }],
  });

  it('records read only the current type: old "0 kg × 60" sets give none (AC-6)', () => {
    const sessions = [
      plank('2026-05-01T09:00:00.000Z', 'duration', [{ weightKg: 0, reps: 60 }]),
      plank('2026-05-08T09:00:00.000Z', 'duration', [{ durationSeconds: 45 }]),
    ];

    const detail = buildExerciseProgressDetail(sessions, 'plank');

    expect(detail?.records).toEqual([
      { type: 'longestTime', value: 45, date: '2026-05-08T09:00:00.000Z' },
    ]);
    // The first timed session had nothing to beat.
    expect(detail?.isRecordSession).toBe(false);
    expect(buildSessionRecords(sessions)).toEqual([]);
    // What was logged is kept as logged (FR-15, FR-16).
    expect(detail?.points.map((point) => point.bestReps)).toEqual([60, undefined]);
    expect(detail?.points.map((point) => point.totalVolume)).toEqual([0, 0]);
  });

  it('without a known type the old reps are read as they are', () => {
    const detail = buildExerciseProgressDetail(
      [plank('2026-05-01T09:00:00.000Z', undefined, [{ weightKg: 0, reps: 60 }])],
      'plank',
    );

    expect(detail?.records.map((record) => record.type)).toContain('mostReps');
  });

  it('reads each type through its own fields', () => {
    const set = {
      weightKg: 20,
      reps: 10,
      repsLeft: 5,
      repsRight: 5,
      durationSeconds: 30,
      distanceMeters: 100,
    };

    expect(recordValuesOf(set, 'weight_reps')).toEqual({
      weightKg: 20,
      reps: 10,
      repsLeft: 5,
      repsRight: 5,
    });
    expect(recordValuesOf(set, 'reps')).toEqual({ reps: 10, repsLeft: 5, repsRight: 5 });
    expect(recordValuesOf(set, 'duration')).toEqual({ durationSeconds: 30 });
    expect(recordValuesOf(set, 'weight_duration')).toEqual({ weightKg: 20, durationSeconds: 30 });
    expect(recordValuesOf(set, 'distance_duration')).toEqual({
      distanceMeters: 100,
      durationSeconds: 30,
    });
    expect(recordValuesOf(set, undefined)).toBe(set);
  });
});
