import type { LiveWorkoutState } from '@workout/domain';
import { describe, expect, it } from 'vitest';

import type {
  WorkoutExerciseDraft,
  WorkoutSessionDraft,
} from '@/features/workouts/state/workoutDraftStore';

import {
  liveUpNext,
  reconcile,
  sameProgress,
  sameRest,
  toLiveWorkoutPayload,
} from './liveWorkoutPayload';

const draft = {
  id: 'workout-session-r1',
  clientId: 'c1',
  routineId: 'r1',
  routineName: 'Push',
  startedAt: '2026-10-16T09:00:00.000Z',
  pausedSeconds: 60,
  exercises: [{ entries: [] }, { entries: [] }],
} as unknown as WorkoutSessionDraft;

const state = (partial: Partial<LiveWorkoutState> = {}): LiveWorkoutState => ({
  workoutSessionId: 'c1',
  pausedSeconds: 60,
  updatedAt: '2026-10-16T09:30:00.000Z',
  ...partial,
});

describe('toLiveWorkoutPayload', () => {
  it('keys the surface by the workout identity and carries pause and kcal', () => {
    expect(toLiveWorkoutPayload(draft, 123)).toMatchObject({
      workoutSessionId: 'c1',
      routineName: 'Push',
      exerciseCount: 2,
      pausedSeconds: 60,
      activeEnergyKcal: 123,
    });
  });
});

const exercise = (
  id: string,
  done: boolean[],
  extra: Partial<WorkoutExerciseDraft> = {},
): WorkoutExerciseDraft => ({
  id,
  exerciseId: `ex-${id}`,
  exerciseName: id === 'b' ? 'Bench press' : 'Row',
  order: 0,
  entries: done.map((isDone, i) => ({
    id: `${id}${i + 1}`,
    order: i + 1,
    reps: '',
    weightKg: '',
    weightPlaceholder: '100',
    repsPlaceholder: '8',
    done: isDone,
    type: 'normal',
  })),
  ...extra,
});

const workout = (...exercises: WorkoutExerciseDraft[]): WorkoutSessionDraft => ({
  ...draft,
  unit: 'kg',
  exercises,
});

describe('progress on the surface (spec 0035)', () => {
  const round = (n: number) => `Round ${n}`;

  it('names the up-next set with its target and counts the sets done (FR-14)', () => {
    const payload = toLiveWorkoutPayload(workout(exercise('b', [true, false, false])), null, (d) =>
      liveUpNext(d, round),
    );
    expect(payload).toMatchObject({ upNext: 'Bench press · 100 kg × 8', setsDone: 1, setsTotal: 3 });
  });

  it('adds the round inside a superset', () => {
    const superset = workout(
      exercise('b', [true, false], { supersetGroup: 1 }),
      exercise('r', [true, false], { supersetGroup: 1 }),
    );
    expect(liveUpNext(superset, round)).toBe('Bench press · 100 kg × 8 · Round 2');
  });

  it('is null once every set is done', () => {
    expect(liveUpNext(workout(exercise('b', [true])), round)).toBeNull();
  });

  it('tells whether the surface shows the same progress (FR-17)', () => {
    const shown = { upNext: 'A', setsDone: 1, setsTotal: 3 };
    expect(sameProgress(shown, { ...shown })).toBe(true);
    expect(sameProgress(shown, { ...shown, setsDone: 2 })).toBe(false);
    expect(sameProgress(shown, { ...shown, setsTotal: 4 })).toBe(false);
    expect(sameProgress(shown, { ...shown, upNext: null })).toBe(false);
    expect(sameProgress(null, shown)).toBe(false);
  });
});

describe('rest on the surface (spec 0018)', () => {
  const rest = { endsAt: '2026-10-16T09:31:30.000Z', totalSeconds: 90, workoutExerciseId: 'we1' };

  it('carries the end of the running rest, absent when none runs', () => {
    expect(toLiveWorkoutPayload({ ...draft, rest }, null).restEndsAt).toBe(rest.endsAt);
    expect(toLiveWorkoutPayload(draft, null).restEndsAt).toBeUndefined();
  });

  it('tells whether the surface shows the same rest', () => {
    expect(sameRest({ rest }, rest.endsAt)).toBe(true);
    expect(sameRest({}, undefined)).toBe(true);
    expect(sameRest({ rest }, undefined)).toBe(false);
    expect(sameRest({}, rest.endsAt)).toBe(false);
    expect(sameRest({ rest: { ...rest, endsAt: '2026-10-16T09:31:45.000Z' } }, rest.endsAt)).toBe(false);
  });
});

describe('reconcile', () => {
  it('does nothing when there is neither a workout nor a surface', () => {
    expect(reconcile(null, null)).toEqual({ kind: 'none' });
  });

  it('ends a surface left without a workout (EF-3)', () => {
    expect(reconcile(null, state())).toEqual({ kind: 'end' });
  });

  it('starts a surface when the system removed it (EF-8)', () => {
    expect(reconcile(draft, null)).toEqual({ kind: 'start' });
  });

  it('starts over when the surface shows another workout', () => {
    expect(reconcile(draft, state({ workoutSessionId: 'old' }))).toEqual({ kind: 'start' });
  });

  it('adopts a pause made on the lock screen (EF-4)', () => {
    const pausedAt = '2026-10-16T09:20:00.000Z';

    expect(reconcile(draft, state({ pausedAt }))).toEqual({
      kind: 'adoptPause',
      pausedAt,
      pausedSeconds: 60,
    });
  });

  it('adopts a resume made on the lock screen', () => {
    const paused = { ...draft, pausedAt: '2026-10-16T09:20:00.000Z' };

    expect(reconcile(paused, state({ pausedSeconds: 660 }))).toEqual({
      kind: 'adoptPause',
      pausedAt: undefined,
      pausedSeconds: 660,
    });
  });

  it('tolerates rounding between whole and fractional seconds', () => {
    expect(reconcile(draft, state({ pausedSeconds: 61 }))).toEqual({ kind: 'none' });
  });
});
