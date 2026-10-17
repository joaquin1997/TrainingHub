import { describe, expect, it } from 'vitest';

import type {
  WorkoutExerciseDraft,
  WorkoutSessionDraft,
  WorkoutSetDraft,
} from '@/features/workouts/state/workoutDraftStore';

import { stickyHeaderModel, upNextTargetLabel } from './stickyHeader';

const set = (id: string, order: number, extra: Partial<WorkoutSetDraft> = {}): WorkoutSetDraft => ({
  id,
  order,
  reps: '',
  weightKg: '',
  done: false,
  type: 'normal',
  ...extra,
});

const exercise = (
  id: string,
  entries: WorkoutSetDraft[],
  extra: Partial<WorkoutExerciseDraft> = {},
): WorkoutExerciseDraft => ({
  id,
  exerciseId: `ex-${id}`,
  exerciseName: `Exercise ${id}`,
  order: 0,
  entries,
  ...extra,
});

const workout = (
  extra: Partial<WorkoutSessionDraft>,
  ...exercises: WorkoutExerciseDraft[]
): WorkoutSessionDraft => ({
  id: 'w',
  clientId: 'c',
  routineId: 'r',
  routineName: 'R',
  startedAt: '2026-10-16T09:00:00.000Z',
  exercises,
  ...extra,
});

describe('stickyHeaderModel (spec 0034 FR-21, AC-14)', () => {
  it('shows round 2 and B2 in an A/B superset with A2 done', () => {
    const draft = workout(
      { lastTickedExerciseId: 'A' },
      exercise('Warm', [set('W1', 1, { done: true })]),
      exercise(
        'A',
        [set('A1', 1, { done: true }), set('A2', 2, { done: true }), set('A3', 3)],
        { supersetGroup: 1 },
      ),
      exercise(
        'B',
        [
          set('B1', 1, { done: true }),
          set('B2', 2, { weightPlaceholder: '60', repsPlaceholder: '8' }),
          set('B3', 3),
        ],
        { supersetGroup: 1 },
      ),
    );

    expect(stickyHeaderModel(draft)).toEqual({
      upNext: {
        workoutExerciseId: 'B',
        workoutSetId: 'B2',
        exerciseName: 'Exercise B',
        blockLabel: '2B',
        setNumber: 2,
        isWarmup: false,
        values: { weight: '60', reps: '8' },
      },
      round: { current: 2, total: 3 },
    });
  });

  it('has no round outside a superset', () => {
    const draft = workout({}, exercise('A', [set('A1', 1, { done: true }), set('A2', 2)]));

    const model = stickyHeaderModel(draft);
    expect(model.upNext?.workoutSetId).toBe('A2');
    expect(model.upNext?.blockLabel).toBe('1');
    expect(model.round).toBeNull();
  });

  it('is the same set as the rest bar: the one after the last tick', () => {
    const draft = workout(
      { lastTickedExerciseId: 'B' },
      exercise('A', [set('A1', 1)]),
      exercise('B', [set('B1', 1, { done: true }), set('B2', 2)]),
    );

    expect(stickyHeaderModel(draft).upNext?.workoutSetId).toBe('B2');
  });

  it('says when the set to do is a warm-up', () => {
    const draft = workout({}, exercise('A', [set('A1', 1, { type: 'warmup' }), set('A2', 2)]));

    expect(stickyHeaderModel(draft).upNext).toMatchObject({ workoutSetId: 'A1', isWarmup: true });
  });

  it('prefers typed values over placeholders and keeps only tracked fields', () => {
    const draft = workout(
      {},
      exercise('A', [
        set('A1', 1, {
          weightKg: '62.5',
          weightPlaceholder: '60',
          reps: '',
          repsPlaceholder: '8',
          duration: '1:00',
        }),
      ]),
    );

    expect(stickyHeaderModel(draft).upNext?.values).toEqual({ weight: '62.5', reps: '8' });
  });

  it('gives both sides of a unilateral set', () => {
    const draft = workout(
      {},
      exercise('A', [set('A1', 1, { repsLeft: '10', repsPlaceholder: '8' })], {
        isUnilateral: true,
      }),
    );

    expect(stickyHeaderModel(draft).upNext?.values).toEqual({ repsLeft: '10', repsRight: '8' });
  });

  it('is empty once every set is done', () => {
    const draft = workout({}, exercise('A', [set('A1', 1, { done: true })]));

    expect(stickyHeaderModel(draft)).toEqual({ upNext: null, round: null });
  });
});

describe('upNextTargetLabel', () => {
  it('reads weight and reps in the session unit', () => {
    expect(upNextTargetLabel({ weight: '60', reps: '8' }, 'kg')).toBe('60 kg × 8');
    expect(upNextTargetLabel({ weight: '135', reps: '5' }, 'lb')).toBe('135 lb × 5');
  });

  it('reads both sides and reps alone', () => {
    expect(upNextTargetLabel({ weight: '20', repsLeft: '10', repsRight: '8' }, 'kg')).toBe(
      '20 kg × 10/8',
    );
    expect(upNextTargetLabel({ reps: '12' }, 'kg')).toBe('× 12');
  });

  it('reads time and distance', () => {
    expect(upNextTargetLabel({ distance: '500', duration: '105' }, 'kg')).toBe('500 m · 1:45');
    expect(upNextTargetLabel({ weight: '20', duration: '1:00' }, 'kg')).toBe('20 kg · 1:00');
  });

  it('is null without any value', () => {
    expect(upNextTargetLabel({}, 'kg')).toBeNull();
  });
});
