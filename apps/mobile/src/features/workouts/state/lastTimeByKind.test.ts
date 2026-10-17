import type { ExerciseLastPerformance, ExerciseLastSet } from '@workout/domain';
import { describe, expect, it } from 'vitest';

import { pairLastSets, pairedPerformance } from './lastTimeByKind';
import {
  applyLastPerformance,
  cycleWorkoutSetType,
  type WorkoutSessionDraft,
  type WorkoutSetDraft,
} from './workoutDraftStore';

function set(overrides: Partial<WorkoutSetDraft> & { id: string }): WorkoutSetDraft {
  return { order: 0, reps: '', weightKg: '', done: false, type: 'normal', ...overrides };
}

function draftWith(entries: WorkoutSetDraft[]): WorkoutSessionDraft {
  return {
    id: 'w1',
    clientId: 'c1',
    routineId: 'r1',
    routineName: 'Legs',
    startedAt: '2026-10-17T08:00:00.000Z',
    unit: 'kg',
    exercises: [
      {
        id: 'we-squat',
        exerciseId: 'ex-squat',
        exerciseName: 'Squat',
        order: 1,
        entries: entries.map((entry, index) => ({ ...entry, order: index + 1 })),
      },
    ],
  };
}

const performance = (sets: ExerciseLastSet[]): ExerciseLastPerformance => ({
  performedAt: '2026-10-10T08:00:00.000Z',
  sets,
});

// Last time: 2 warm-ups, then 3 working sets at 100, 105, 110 (AC-10).
const lastSquats = performance([
  { order: 1, reps: 10, weightKg: 20, isWarmup: true },
  { order: 2, reps: 5, weightKg: 60, isWarmup: true },
  { order: 3, reps: 5, weightKg: 100 },
  { order: 4, reps: 5, weightKg: 105 },
  { order: 5, reps: 5, weightKg: 110 },
]);

const warmUp = (id: string) => set({ id, type: 'warmup' });
const working = (id: string) => set({ id });

describe('pairLastSets', () => {
  it('pairs warm-ups with warm-ups and working sets with working sets (AC-10)', () => {
    const entries = [
      warmUp('a'),
      warmUp('b'),
      warmUp('c'),
      warmUp('d'),
      warmUp('e'),
      working('f'),
      working('g'),
      working('h'),
    ];

    const paired = pairLastSets(lastSquats.sets, entries);

    expect(paired.map((last) => last?.weightKg)).toEqual([
      20,
      60,
      undefined,
      undefined,
      undefined,
      100,
      105,
      110,
    ]);
  });

  it("never gives the first working set last time's warm-up (AC-11)", () => {
    const last = performance([
      { order: 1, reps: 10, weightKg: 20, isWarmup: true },
      { order: 2, reps: 5, weightKg: 100 },
    ]);

    expect(pairLastSets(last.sets, [working('a'), working('b')])).toEqual([
      { order: 2, reps: 5, weightKg: 100 },
      undefined,
    ]);
  });

  it('treats every set as working when the server does not say (EF-8)', () => {
    const legacy = performance([
      { order: 1, reps: 5, weightKg: 100 },
      { order: 2, reps: 5, weightKg: 105 },
    ]);

    expect(pairLastSets(legacy.sets, [warmUp('a'), working('b'), working('c')])).toEqual([
      undefined,
      { order: 1, reps: 5, weightKg: 100 },
      { order: 2, reps: 5, weightKg: 105 },
    ]);
  });

  it('counts drop and failure sets as working sets', () => {
    const paired = pairLastSets(lastSquats.sets, [
      set({ id: 'a', type: 'drop' }),
      set({ id: 'b', type: 'failure' }),
    ]);

    expect(paired.map((last) => last?.weightKg)).toEqual([100, 105]);
  });
});

describe('pairedPerformance', () => {
  it("renumbers the paired sets to today's order for the previous column", () => {
    const entries = [warmUp('a'), working('b')].map((entry, index) => ({
      ...entry,
      order: index + 1,
    }));

    expect(pairedPerformance(lastSquats, entries)).toEqual({
      performedAt: lastSquats.performedAt,
      sets: [
        { order: 1, reps: 10, weightKg: 20, isWarmup: true },
        { order: 2, reps: 5, weightKg: 100 },
      ],
    });
    expect(pairedPerformance(null, entries)).toBeNull();
  });
});

describe('applyLastPerformance by kind', () => {
  it('ghosts working sets with last time working sets after warm-ups are inserted (AC-10)', () => {
    const draft = draftWith([
      warmUp('a'),
      warmUp('b'),
      warmUp('c'),
      working('f'),
      working('g'),
      working('h'),
    ]);

    const entries = applyLastPerformance(draft, 'ex-squat', lastSquats).exercises[0]!.entries;

    expect(entries.map((entry) => entry.weightPlaceholder)).toEqual([
      '20',
      '60',
      undefined,
      '100',
      '105',
      '110',
    ]);
  });

  it('re-pairs a set whose type changes (FR-20) and drops a borrowed value (FR-19)', () => {
    const draft = draftWith([
      set({ id: 'f', targetWeight: 90, maxReps: 8 }),
      working('g'),
    ]);
    const last = performance([
      { order: 1, reps: 5, weightKg: 100 },
      { order: 2, reps: 5, weightKg: 105 },
    ]);
    const applied = applyLastPerformance(draft, 'ex-squat', last);
    expect(applied.exercises[0]!.entries[0]!.weightPlaceholder).toBe('100');

    // The first set becomes a warm-up: last time had none, so it shows its
    // routine target again; the second set is now the first working set.
    const warm = cycleWorkoutSetType(applied, 'we-squat', 'f');
    const repaired = applyLastPerformance(warm, 'ex-squat', last).exercises[0]!.entries;

    expect(repaired[0]!.type).toBe('warmup');
    expect(repaired[0]!.weightPlaceholder).toBe('90');
    expect(repaired[0]!.repsPlaceholder).toBe('8');
    expect(repaired[0]!.lastTimePaired).toBeUndefined();
    expect(repaired[1]!.weightPlaceholder).toBe('100');
  });

  it('leaves sets never paired with last time alone', () => {
    const draft = draftWith([warmUp('a')].map((entry) => ({ ...entry, weightPlaceholder: '40' })));

    const next = applyLastPerformance(draft, 'ex-squat', performance([{ order: 1, weightKg: 100 }]));

    expect(next).toBe(draft);
  });
});
