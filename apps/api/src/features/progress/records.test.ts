import { describe, expect, it } from 'vitest';

import {
  bestEstimatedOneRepMax,
  bestSessionVolume,
  bestSetVolume,
  deriveExerciseRecords,
  heaviestWeight,
  mostReps,
  type ExerciseSessionWork,
} from './records.js';

const day = (n: number) => `2026-05-${String(n).padStart(2, '0')}T09:00:00.000Z`;

function session(n: number, sets: Array<[number | null, number | null]>): ExerciseSessionWork {
  return { date: day(n), sets: sets.map(([weightKg, reps]) => ({ weightKg, reps })) };
}

describe('single-value record types', () => {
  const sets = [
    { weightKg: 100, reps: 5 },
    { weightKg: 80, reps: 12 },
    { weightKg: null, reps: 20 },
  ];

  it('heaviest weight keeps the set it came from', () => {
    expect(heaviestWeight(sets)).toEqual({ value: 100, weightKg: 100, reps: 5 });
  });

  it('most reps counts sets without weight', () => {
    expect(mostReps(sets)).toEqual({ value: 20, weightKg: undefined, reps: 20 });
  });

  it('best set volume is weight × reps of one set', () => {
    expect(bestSetVolume(sets)).toEqual({ value: 960, weightKg: 80, reps: 12 });
  });

  it('best session volume sums the sets', () => {
    expect(bestSessionVolume(sets)).toEqual({ value: 1460 });
  });

  it('best estimated 1RM uses Epley', () => {
    expect(bestEstimatedOneRepMax(sets)).toEqual({ value: 116.7, weightKg: 100, reps: 5 });
  });

  it('returns nothing for sets with no value', () => {
    const empty = [{ weightKg: null, reps: null }];
    expect(heaviestWeight(empty)).toBeUndefined();
    expect(mostReps(empty)).toBeUndefined();
    expect(bestSetVolume(empty)).toBeUndefined();
    expect(bestSessionVolume(empty)).toBeUndefined();
    expect(bestEstimatedOneRepMax(empty)).toBeUndefined();
  });
});

describe('deriveExerciseRecords', () => {
  it('the first session beats nothing (EF-1) but sets the bests', () => {
    const { bests, hits } = deriveExerciseRecords([session(1, [[100, 6]])]);

    expect(hits).toEqual([[]]);
    expect(bests.map((record) => record.type)).toEqual([
      'heaviestWeight',
      'mostReps',
      'repsAtWeight',
      'bestSetVolume',
      'bestSessionVolume',
      'bestEstimatedOneRepMax',
    ]);
    expect(bests.every((record) => record.date === day(1))).toBe(true);
  });

  it('100 × 8 after 100 × 6 is most reps at 100 kg (AC-1)', () => {
    const { bests, hits } = deriveExerciseRecords([
      session(1, [[100, 6]]),
      session(8, [[100, 8]]),
    ]);

    expect(hits[1]).toContainEqual({
      type: 'repsAtWeight',
      value: 8,
      weightKg: 100,
      date: day(8),
    });
    expect(hits[1]?.map((record) => record.type)).not.toContain('heaviestWeight');
    expect(bests.find((record) => record.type === 'repsAtWeight')).toEqual({
      type: 'repsAtWeight',
      value: 8,
      weightKg: 100,
      date: day(8),
    });
    expect(bests.find((record) => record.type === 'mostReps')?.value).toBe(8);
  });

  it('needs a strict improvement; a tie keeps the first date', () => {
    const { bests, hits } = deriveExerciseRecords([
      session(1, [[100, 6]]),
      session(8, [[100, 6]]),
    ]);

    expect(hits[1]).toEqual([]);
    expect(bests.find((record) => record.type === 'heaviestWeight')?.date).toBe(day(1));
  });

  it('fewer reps at a lighter weight than at a heavier one is no record', () => {
    const { hits } = deriveExerciseRecords([
      session(1, [[100, 8]]),
      session(8, [[95, 6]]),
    ]);

    expect(hits[1]).toEqual([]);
  });

  it('more reps at a lighter weight than at any heavier one is a record', () => {
    const { hits } = deriveExerciseRecords([
      session(1, [[100, 6]]),
      session(8, [[90, 10]]),
    ]);

    expect(hits[1]).toContainEqual({
      type: 'repsAtWeight',
      value: 10,
      weightKg: 90,
      date: day(8),
    });
  });

  it('a new heaviest weight is not also a reps-at-weight record', () => {
    const { hits } = deriveExerciseRecords([
      session(1, [[100, 6]]),
      session(8, [[110, 2]]),
    ]);

    expect(hits[1]?.map((record) => record.type)).toEqual(['heaviestWeight']);
  });

  it('announces one reps-at-weight record, at the heaviest weight beaten', () => {
    const { hits } = deriveExerciseRecords([
      session(1, [[100, 6], [90, 8]]),
      session(8, [[100, 7], [90, 9]]),
    ]);

    expect(hits[1]?.filter((record) => record.type === 'repsAtWeight')).toEqual([
      { type: 'repsAtWeight', value: 7, weightKg: 100, date: day(8) },
    ]);
  });

  it('a higher session volume is a session-volume record (AC-2)', () => {
    const { hits } = deriveExerciseRecords([
      session(1, [[100, 5], [100, 5]]),
      session(8, [[100, 5], [100, 5], [100, 5]]),
    ]);

    expect(hits[1]).toEqual([
      { type: 'bestSessionVolume', value: 1500, date: day(8) },
    ]);
  });

  it('keeps most reps for the three heaviest weights, with their dates', () => {
    const { bests } = deriveExerciseRecords([
      session(1, [[60, 12], [70, 10]]),
      session(8, [[80, 8], [90, 5]]),
      session(15, [[80, 9]]),
    ]);

    expect(bests.filter((record) => record.type === 'repsAtWeight')).toEqual([
      { type: 'repsAtWeight', value: 5, weightKg: 90, date: day(8) },
      { type: 'repsAtWeight', value: 9, weightKg: 80, date: day(15) },
      { type: 'repsAtWeight', value: 10, weightKg: 70, date: day(1) },
    ]);
  });

  it('a type with no earlier value has nothing to beat (EF-1)', () => {
    const { hits } = deriveExerciseRecords([
      session(1, [[null, 12]]),
      session(8, [[20, 12]]),
    ]);

    expect(hits[1]).toEqual([]);
  });
});
