import { describe, expect, it } from 'vitest';
import { comparisonHits, recordsFromSets, setComparisonHits } from '@workout/domain';
import { buildComparisonReferences } from './comparisonReferences.js';
import type { ProgressSessionInput } from './aggregate.js';

const before = '2026-11-04T10:00:00Z';
const session = (id: string, startedAt: string, sets = [{ weightKg: 45, reps: 5 }]): ProgressSessionInput => ({
  workoutId: id, date: startedAt, startedAt,
  exercises: [{ exerciseId: 'e', exerciseName: 'Lift', sets }],
});
const empty = recordsFromSets('e', []);

describe('comparison references and scope rules (0048)', () => {
  it('distinguishes all-time PR from last-session improvement, with strict equality', () => {
    const historical = recordsFromSets('e', [{ weightKg: 50, reps: 5 }]);
    const last = { sessionId: 's', date: '2026-11-03T10:00:00Z', records: recordsFromSets('e', [{ weightKg: 45, reps: 5 }]) };
    expect(setComparisonHits({ weightKg: 47, reps: 5 }, historical, last).find((hit) => hit.type === 'heaviestWeight'))
      .toMatchObject({ baselineScope: 'lastSession', baselineValue: 45, value: 47 });
    expect(setComparisonHits({ weightKg: 52, reps: 5 }, historical, last).find((hit) => hit.type === 'heaviestWeight'))
      .toMatchObject({ baselineScope: 'historical', baselineValue: 50, lastSessionValue: 45 });
    expect(setComparisonHits({ weightKg: 45, reps: 5 }, historical, last)).toEqual([]);
    expect(setComparisonHits({ weightKg: 52, reps: 5 }, empty, null)).toEqual([]);
  });
  it('compares reps to exactly that weight last time, preserving historical same-or-heavier', () => {
    const historical = recordsFromSets('e', [{ weightKg: 110, reps: 8 }]);
    const last = { sessionId: 's', date: before, records: recordsFromSets('e', [{ weightKg: 100, reps: 5 }, { weightKg: 80, reps: 12 }]) };
    const hits = setComparisonHits({ weightKg: 100, reps: 9 }, historical, last);
    expect(hits.find((hit) => hit.type === 'repsAtWeight')).toMatchObject({ baselineScope: 'historical', baselineValue: 8, lastSessionValue: 5 });
    expect(setComparisonHits({ weightKg: 90, reps: 6 }, undefined, last).some((hit) => hit.type === 'repsAtWeight')).toBe(false);
  });
  it('supports one missing source without a fictitious zero', () => {
    const historical = recordsFromSets('e', [{ durationSeconds: 30 }]);
    expect(setComparisonHits({ durationSeconds: 40 }, historical).map((hit) => hit.baselineScope)).toEqual(['historical']);
    const last = { sessionId: 's', date: before, records: historical };
    expect(setComparisonHits({ durationSeconds: 40 }, undefined, last).map((hit) => hit.baselineScope)).toEqual(['lastSession']);
    expect(comparisonHits([{ type: 'bestSessionVolume', value: 600 }], { ...empty, bests: { bestSessionVolume: 500 } })[0]?.baselineValue).toBe(500);
  });
  it('freezes references strictly before workout start, orders ties and merges occurrences', () => {
    const old = session('old', '2026-11-01T10:00:00Z', [{ weightKg: 50, reps: 5 }]);
    const previous = session('z', '2026-11-03T10:00:00Z');
    previous.exercises.push({ exerciseId: 'e', exerciseName: 'Lift', sets: [{ weightKg: 45, reps: 3 }] });
    const tied = session('a', '2026-11-03T10:00:00Z');
    const excluded = session('current', before, [{ weightKg: 1000, reps: 5 }]);
    const [reference] = buildComparisonReferences([excluded, tied, previous, old], ['e'], before, new Set(['e']));
    expect(reference?.historical).toMatchObject({ status: 'ready', value: { bests: { heaviestWeight: 50 } } });
    expect(reference?.lastSession).toMatchObject({ status: 'ready', value: { sessionId: 'z', records: { bests: { bestSessionVolume: 360 } } } });
  });
  it('excludes unfinished and warm-up work while preserving whole-session legacy completion', () => {
    const prior = session('s', '2026-11-03T10:00:00Z');
    prior.exercises[0]!.sets = [
      { weightKg: 1000, reps: 10, completedAt: '2026-11-03', type: 'warmup' },
      { weightKg: 1000, reps: 10, completedAt: null },
      { weightKg: 45, reps: 5, completedAt: '2026-11-03' },
    ];
    expect(buildComparisonReferences([prior], ['e'], before, new Set(['e']))[0]?.historical)
      .toMatchObject({ status: 'ready', value: { bests: { heaviestWeight: 45 } } });
    expect(buildComparisonReferences([session('legacy', '2026-11-03T10:00:00Z')], ['e'], before, new Set(['e']))[0]?.lastSession)
      .toMatchObject({ status: 'ready', value: { records: { bests: { heaviestWeight: 45 } } } });
  });
  it('distinguishes visible empty history from inaccessible identities without name merging', () => {
    expect(buildComparisonReferences([], ['e'], before, new Set(['e']))[0]?.lastSession).toEqual({ status: 'ready', value: null });
    expect(buildComparisonReferences([], ['foreign'], before, new Set())[0]).toEqual({ exerciseId: 'foreign', historical: { status: 'unavailable' }, lastSession: { status: 'unavailable' } });
  });
});
