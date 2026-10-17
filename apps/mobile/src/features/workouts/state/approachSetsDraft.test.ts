import { describe, expect, it } from 'vitest';

import { addApproachSets, canAddApproachSets } from './approachSetsDraft';
import {
  toCreateWorkoutSessionInput,
  type WorkoutSessionDraft,
  type WorkoutSetDraft,
} from './workoutDraftStore';

function set(overrides: Partial<WorkoutSetDraft> & { id: string }): WorkoutSetDraft {
  return { order: 0, reps: '', weightKg: '', done: false, type: 'normal', ...overrides };
}

function draftWith(entries: WorkoutSetDraft[], unit: 'kg' | 'lb' = 'kg'): WorkoutSessionDraft {
  return {
    id: 'w1',
    clientId: 'c1',
    routineId: 'r1',
    routineName: 'Legs',
    startedAt: '2026-10-17T08:00:00.000Z',
    unit,
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

const entriesOf = (draft: WorkoutSessionDraft) => draft.exercises[0]!.entries;

describe('addApproachSets', () => {
  it('puts warm-up sets before the first working set (AC-1)', () => {
    const draft = draftWith([
      set({ id: 'w-1', weightKg: '140', reps: '5' }),
      set({ id: 'w-2', weightKg: '140', reps: '5' }),
    ]);

    const { draft: next, outcome } = addApproachSets(draft, 'we-squat');

    expect(outcome).toBe('added');
    const entries = entriesOf(next);
    expect(entries.map((entry) => [entry.type, entry.weightKg, entry.reps])).toEqual([
      ['warmup', '20', '10'],
      ['warmup', '55', '5'],
      ['warmup', '85', '3'],
      ['warmup', '105', '2'],
      ['warmup', '125', '1'],
      ['normal', '140', '5'],
      ['normal', '140', '5'],
    ]);
    expect(entries.map((entry) => entry.order)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(entries[5]!.id).toBe('w-1');
    expect(new Set(entries.map((entry) => entry.id)).size).toBe(7);
  });

  it('reads the ghosted weight when none is typed, in the session unit (AC-2)', () => {
    const draft = draftWith([set({ id: 'w-1', weightPlaceholder: '315' })], 'lb');

    const entries = entriesOf(addApproachSets(draft, 'we-squat').draft);

    expect(entries.slice(0, 5).map((entry) => entry.weightKg)).toEqual([
      '45',
      '125',
      '190',
      '235',
      '285',
    ]);
  });

  it('saves them as warm-ups, in kg (FR-2)', () => {
    const draft = draftWith([set({ id: 'w-1', weightKg: '140', reps: '5' })]);

    const input = toCreateWorkoutSessionInput(addApproachSets(draft, 'we-squat').draft);
    const first = input.exercises[0]!.sets[0]!;

    expect(first).toMatchObject({ type: 'warmup', isWarmup: true, weightKg: 20, reps: 10 });
    expect(input.exercises[0]!.sets[5]).toMatchObject({ type: 'normal', weightKg: 140 });
  });

  it('replaces warm-ups not yet done, keeps done ones', () => {
    const draft = draftWith([
      set({ id: 'old-done', type: 'warmup', weightKg: '20', reps: '10', done: true }),
      set({ id: 'old-todo', type: 'warmup', weightKg: '40', reps: '8' }),
      set({ id: 'w-1', weightKg: '100', reps: '5' }),
    ]);

    const entries = entriesOf(addApproachSets(draft, 'we-squat').draft);

    expect(entries[0]!.id).toBe('old-done');
    expect(entries.some((entry) => entry.id === 'old-todo')).toBe(false);
    expect(entries[entries.length - 1]!.id).toBe('w-1');
    expect(entries.filter((entry) => entry.type === 'warmup')).toHaveLength(6);
  });

  it('explains instead of guessing when there is no working weight (EF-1)', () => {
    const empty = draftWith([set({ id: 'w-1', reps: '5' })]);
    expect(addApproachSets(empty, 'we-squat')).toEqual({ draft: empty, outcome: 'noWeight' });

    const onlyWarmups = draftWith([set({ id: 'w-1', type: 'warmup', weightKg: '60' })]);
    expect(addApproachSets(onlyWarmups, 'we-squat').outcome).toBe('noWeight');
  });

  it('adds nothing for a working weight at the bar (EF-2)', () => {
    const draft = draftWith([set({ id: 'w-1', weightKg: '20', reps: '10' })]);
    expect(addApproachSets(draft, 'we-squat')).toEqual({ draft, outcome: 'tooLight' });
  });

  it('is offered for weight & reps exercises only', () => {
    expect(canAddApproachSets({})).toBe(true);
    expect(canAddApproachSets({ trackingType: 'weight_reps' })).toBe(true);
    expect(canAddApproachSets({ trackingType: 'reps' })).toBe(false);
    expect(canAddApproachSets({ trackingType: 'weight_duration' })).toBe(false);
  });
});
