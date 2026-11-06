import { describe, expect, it } from 'vitest';
import { buildExerciseProgressDetail, selectPerformedWork, type ProgressSessionInput } from './aggregate.js';

type Sets = ProgressSessionInput['exercises'][number]['sets'];
const workout = (id: string, sets: Sets, extra: Sets = []): ProgressSessionInput => ({
  workoutId: id, date: '2026-11-02T10:00:00Z', exercises: [
    { exerciseId: 'bench', exerciseName: 'Bench', trackingType: 'weight_reps', sets },
    ...(extra.length ? [{ exerciseId: 'bench', exerciseName: 'Bench', sets: extra }] : []),
  ],
});
describe('readable exercise evidence (0042)', () => {
  it('keeps the real heaviest pair, groups occurrences, and sums their volume', () => {
    const detail = buildExerciseProgressDetail([workout('w1', [
      { setId: 's1', reps: 5, weightKg: 100 }, { setId: 's2', reps: 12, weightKg: 80 },
    ], [{ setId: 's3', reps: 6, weightKg: 90 }])], 'bench')!;
    expect(detail.readableProgressVersion).toBe(1);
    expect(detail.sessionCount).toBe(1);
    expect(detail.points).toHaveLength(1);
    expect(detail.points[0]).toMatchObject({ workoutId: 'w1', heaviestWorkingSet: { setId: 's1', weightKg: 100, reps: 5 },
      bestReps: 12, totalWorkingReps: 23, totalVolume: 2000, sessionVolumeKg: 2000 });
    expect(detail.latestReps).toBe(5);
    expect(detail.isRecordSession).toBe(false);
  });
  it('breaks weight ties by same-set reps, then occurrence/set order', () => {
    const detail = buildExerciseProgressDetail([workout('w1', [
      { setId: 'later', exerciseOrder: 2, setOrder: 1, weightKg: 100, reps: 6 },
      { setId: 'early', exerciseOrder: 1, setOrder: 2, weightKg: 100, reps: 6 },
      { setId: 'fewer', exerciseOrder: 0, setOrder: 0, weightKg: 100, reps: 5 },
    ])], 'bench')!;
    expect(detail.points[0].heaviestWorkingSet?.setId).toBe('early');
  });
  it('preserves unilateral evidence and better-side max vs both-side volume', () => {
    const detail = buildExerciseProgressDetail([workout('w1', [
      { weightKg: 20, reps: 18, repsLeft: 10, repsRight: 8 },
    ])], 'bench')!;
    expect(detail.points[0]).toMatchObject({ heaviestWorkingSet: { repsLeft: 10, repsRight: 8 }, bestReps: 10,
      totalWorkingReps: 18, sessionVolumeKg: 360 });
  });
  it('keeps warm-ups in volume and unfinished sets out of all evidence', () => {
    const detail = buildExerciseProgressDetail(selectPerformedWork([workout('w1', [
      { weightKg: 140, reps: 2, type: 'warmup', completedAt: '2026-11-02' },
      { weightKg: 120, reps: 5 }, { weightKg: 100, reps: 5, completedAt: '2026-11-02' },
    ])]), 'bench')!;
    expect(detail.points[0]).toMatchObject({ bestWeightKg: 100, totalWorkingReps: 5, sessionVolumeKg: 780 });
    expect(detail.points[0].heaviestWorkingSet?.weightKg).toBe(100);
  });
  it('does not mistake an unfinished exercise for a legacy session', () => {
    const input = workout('w1', [{ weightKg: 100, reps: 5 }]);
    input.exercises.push({ exerciseId: 'other', exerciseName: 'Other', sets: [{ reps: 10, completedAt: '2026-11-02' }] });
    expect(buildExerciseProgressDetail(selectPerformedWork([input]), 'bench')).toBeNull();
  });
  it('distinguishes missing volume from recorded zero and never infers time from reps', () => {
    const missing = buildExerciseProgressDetail([workout('w1', [{ reps: 20 }])], 'bench')!;
    expect(missing.points[0].sessionVolumeKg).toBeUndefined();
    expect(missing.points[0].bestDurationSeconds).toBeUndefined();
    const zero = buildExerciseProgressDetail([workout('w1', [{ reps: 20, weightKg: 0 }])], 'bench')!;
    expect(zero.points[0].sessionVolumeKg).toBe(0);
  });
  it('preserves original timed quantities without calculating lifting estimates', () => {
    const detail = buildExerciseProgressDetail([workout('w1', [{ weightKg: 20, durationSeconds: 30, reps: 10 }])], 'bench')!;
    expect(detail.points[0]).toMatchObject({ bestDurationSeconds: 30, heaviestWorkingSet: { weightKg: 20, durationSeconds: 30 } });
    expect(detail.points[0].estimatedOneRepMax).toBeUndefined();
  });
  it('keeps identical-timestamp workouts distinct and deterministic', () => {
    const detail = buildExerciseProgressDetail([
      workout('w-b', [{ weightKg: 100, reps: 5 }]), workout('w-a', [{ weightKg: 80, reps: 5 }]),
    ], 'bench')!;
    expect(detail.points.map((point) => point.workoutId)).toEqual(['w-a', 'w-b']);
    expect(detail.sessionCount).toBe(2);
    expect(detail.points.map((point) => point.isRecord)).toEqual([undefined, true]);
  });
});
