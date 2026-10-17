import {
  repsAtOrAbove,
  sessionVolumeHit,
  SET_RECORD_VALUES,
  setRecordHits,
  type StartingRecords,
} from '@workout/domain';
import { describe, expect, it } from 'vitest';

/**
 * The per-set record rules shared with the phone (spec 0032), tested here
 * because the domain package has no test runner of its own. The API's record
 * derivation goes through the same functions (records.test.ts).
 */

const starting = (overrides: Partial<StartingRecords> = {}): StartingRecords => ({
  exerciseId: 'bench',
  bests: {},
  repsAtWeight: [],
  ...overrides,
});

describe('SET_RECORD_VALUES', () => {
  it('reads weight types from lifting sets only', () => {
    const carry = { weightKg: 24, durationSeconds: 40 };
    expect(SET_RECORD_VALUES.heaviestWeight(carry)).toBeUndefined();
    expect(SET_RECORD_VALUES.longestTime(carry)).toBe(40);
  });

  it('reads the better side for reps and 1RM, both sides for volume', () => {
    const split = { weightKg: 20, reps: 19, repsLeft: 11, repsRight: 8 };
    expect(SET_RECORD_VALUES.mostReps(split)).toBe(11);
    expect(SET_RECORD_VALUES.bestSetVolume(split)).toBe(380);
    expect(SET_RECORD_VALUES.bestEstimatedOneRepMax(split)).toBe(27.3);
  });
});

describe('repsAtOrAbove', () => {
  it('takes the most reps at that weight or heavier, none below', () => {
    const entries = [
      { weightKg: 100, reps: 6 },
      { weightKg: 110, reps: 3 },
      { weightKg: 90, reps: 12 },
    ];
    expect(repsAtOrAbove(entries, 100)).toBe(6);
    expect(repsAtOrAbove(entries, 95)).toBe(6);
    expect(repsAtOrAbove(entries, 120)).toBeUndefined();
  });
});

describe('setRecordHits', () => {
  it('beats reps at a weight already reached, strictly', () => {
    const records = starting({ repsAtWeight: [{ weightKg: 100, reps: 6 }] });
    expect(setRecordHits({ weightKg: 100, reps: 8 }, records)).toEqual([
      { type: 'repsAtWeight', value: 8, weightKg: 100 },
    ]);
    expect(setRecordHits({ weightKg: 100, reps: 6 }, records)).toEqual([]);
  });

  it('leaves a weight never reached to heaviest weight', () => {
    const records = starting({
      bests: { heaviestWeight: 100 },
      repsAtWeight: [{ weightKg: 100, reps: 6 }],
    });
    expect(setRecordHits({ weightKg: 105, reps: 3 }, records).map((hit) => hit.type)).toEqual([
      'heaviestWeight',
    ]);
  });

  it('never beats a type with no starting value', () => {
    expect(setRecordHits({ weightKg: 200, reps: 20 }, starting())).toEqual([]);
  });

  it('lists every type beaten, in display order', () => {
    const records = starting({
      bests: { heaviestWeight: 100, mostReps: 10, bestSetVolume: 600, bestEstimatedOneRepMax: 120 },
      repsAtWeight: [{ weightKg: 100, reps: 6 }],
    });
    expect(setRecordHits({ weightKg: 100, reps: 12 }, records).map((hit) => hit.type)).toEqual([
      'mostReps',
      'repsAtWeight',
      'bestSetVolume',
      'bestEstimatedOneRepMax',
    ]);
  });
});

describe('sessionVolumeHit', () => {
  it('beats the starting best session volume strictly', () => {
    const records = starting({ bests: { bestSessionVolume: 5000 } });
    const sets = [
      { weightKg: 100, reps: 25 },
      { weightKg: 100, reps: 25 },
    ];
    expect(sessionVolumeHit(sets, records)).toBeUndefined();
    expect(sessionVolumeHit([...sets, { weightKg: 10, reps: 1 }], records)).toEqual({
      type: 'bestSessionVolume',
      value: 5010,
    });
  });
});
