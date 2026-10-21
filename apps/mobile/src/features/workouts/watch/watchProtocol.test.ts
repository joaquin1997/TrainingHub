import type { WatchWorkoutEvent } from '@workout/domain';
import { describe, expect, it } from 'vitest';

import type {
  WorkoutExerciseDraft,
  WorkoutSessionDraft,
} from '@/features/workouts/state/workoutDraftStore';

import { applyWatchEvent, currentSetToDo, setTarget, toWatchSnapshot } from './watchProtocol';

const exercise = (
  id: string,
  done: boolean[],
  extra: Partial<WorkoutExerciseDraft> = {},
): WorkoutExerciseDraft => ({
  id,
  exerciseId: `ex-${id}`,
  exerciseName: id.toUpperCase(),
  order: 0,
  entries: done.map((isDone, i) => ({
    id: `${id}${i + 1}`,
    order: i + 1,
    reps: '',
    weightKg: '',
    weightPlaceholder: '60',
    repsPlaceholder: '8',
    done: isDone,
    type: 'normal',
  })),
  ...extra,
});

const workout = (...exercises: WorkoutExerciseDraft[]): WorkoutSessionDraft => ({
  id: 'w',
  clientId: 'c1',
  routineId: 'r',
  routineName: 'Push',
  startedAt: '2026-10-17T09:00:00.000Z',
  unit: 'lb',
  exercises,
});

const at = (seconds: number) => new Date(Date.UTC(2026, 9, 17, 9, 10, seconds)).toISOString();

const tick = (
  workoutExerciseId: string,
  workoutSetId: string,
  seconds: number,
  workoutSessionId = 'c1',
): WatchWorkoutEvent => ({
  kind: 'setDone',
  id: `e-${workoutSetId}`,
  workoutSessionId,
  workoutExerciseId,
  workoutSetId,
  at: at(seconds),
});

describe('currentSetToDo (spec 0025 FR-4)', () => {
  it('is the first set left when no rest runs', () => {
    expect(currentSetToDo(workout(exercise('a', [true, true]), exercise('b', [true, false])))).toEqual({
      workoutExerciseId: 'b',
      workoutSetId: 'b2',
    });
  });

  it('follows the superset order after a tick', () => {
    const draft = applyWatchEvent(
      workout(exercise('a', [false, false], { supersetGroup: 1 }), exercise('b', [false, false], { supersetGroup: 1 })),
      tick('a', 'a1', 0),
      90,
    );
    expect(currentSetToDo(draft)).toEqual({ workoutExerciseId: 'b', workoutSetId: 'b1' });
  });

  it('is null when every set is done', () => {
    expect(currentSetToDo(workout(exercise('a', [true])))).toBeNull();
  });
});

describe('toWatchSnapshot', () => {
  it('shows the current set in the workout unit, with its rest (Art. 4)', () => {
    const snapshot = toWatchSnapshot(
      workout(exercise('a', [true, false, false], { restSeconds: 150 })),
      90,
    );

    expect(snapshot).toEqual({
      workoutSessionId: 'c1',
      routineName: 'Push',
      setsDone: 1,
      startedAt: '2026-10-17T09:00:00.000Z',
      pausedAt: undefined,
      pausedSeconds: 0,
      restEndsAt: undefined,
      currentSet: {
        workoutExerciseId: 'a',
        workoutSetId: 'a2',
        exerciseName: 'A',
        setNumber: 2,
        setCount: 3,
        isWarmup: false,
        target: '60 lb × 8',
        restSeconds: 150,
      },
    });
  });

  it('numbers working sets after the warm-ups from 1 (spec 0040 FR-1)', () => {
    const base = exercise('a', [true, true, false, false]);
    const withWarmUps = {
      ...base,
      entries: base.entries.map((set, i) => (i < 2 ? { ...set, type: 'warmup' as const } : set)),
    };
    const set = toWatchSnapshot(workout(withWarmUps), 90).currentSet;

    expect(set).toMatchObject({ workoutSetId: 'a3', setNumber: 1, setCount: 2, isWarmup: false });
  });

  it('has no current set when all are done', () => {
    expect(toWatchSnapshot(workout(exercise('a', [true])), 90).currentSet).toBeUndefined();
  });

  it('prefers typed values and leaves out what is missing', () => {
    const set = exercise('a', [false]).entries[0]!;
    expect(setTarget({ ...set, weightKg: '62.5', reps: '6' }, 'kg')).toBe('62.5 kg × 6');
    // Spec 0021: the exercise's tracking type picks the fields.
    expect(setTarget({ ...set, durationPlaceholder: '0:45' }, 'kg', 'duration')).toBe('0:45');
    expect(
      setTarget({ ...set, distance: '500', duration: '1:45' }, 'kg', 'distance_duration'),
    ).toBe('500 m 1:45');
    expect(setTarget({ ...set, weightPlaceholder: undefined }, 'kg')).toBe('× 8');
    expect(setTarget({ ...set, repsPlaceholder: undefined }, 'kg')).toBe('60 kg');
    expect(
      setTarget({ ...set, weightPlaceholder: undefined, repsPlaceholder: undefined }, 'kg'),
    ).toBe('');
  });

  it('shows left and right of a unilateral exercise (spec 0022)', () => {
    const set = exercise('a', [false]).entries[0]!;
    expect(setTarget({ ...set, repsLeft: '10', repsRightPlaceholder: '8' }, 'kg', undefined, true)).toBe(
      '60 kg × 10/8',
    );
    // Both sides ghost the set's reps (routine target) when they have none.
    expect(setTarget(set, 'kg', 'weight_reps', true)).toBe('60 kg × 8/8');
    expect(setTarget({ ...set, repsPlaceholder: undefined, repsLeft: '9' }, 'kg', 'reps', true)).toBe(
      '× 9/–',
    );

    const snapshot = toWatchSnapshot(
      workout(exercise('a', [false], { isUnilateral: true })),
      90,
    );
    expect(snapshot.currentSet?.target).toBe('60 lb × 8/8');
  });
});

describe('applyWatchEvent (spec 0025 AC-3, EF-1)', () => {
  it('ticks the set and starts the rest from the tick instant', () => {
    const draft = applyWatchEvent(workout(exercise('a', [false, false], { restSeconds: 120 })), tick('a', 'a1', 0), 90);

    expect(draft.exercises[0]!.entries[0]!.done).toBe(true);
    expect(draft.rest).toEqual({ endsAt: at(120), totalSeconds: 120, workoutExerciseId: 'a' });
  });

  it('applies queued ticks in order, and a replay changes nothing', () => {
    const start = workout(exercise('a', [false, false]));
    const first = applyWatchEvent(start, tick('a', 'a1', 0), 90);
    const second = applyWatchEvent(first, tick('a', 'a2', 100), 90);

    expect(second.exercises[0]!.entries.map((set) => set.done)).toEqual([true, true]);
    expect(second.rest?.endsAt).toBe(at(190));
    expect(applyWatchEvent(second, tick('a', 'a1', 0), 90)).toBe(second);
  });

  it('never replaces a rest that ends later with a late tick', () => {
    const resting = applyWatchEvent(workout(exercise('a', [false, false])), tick('a', 'a2', 50), 90);
    const late = applyWatchEvent(resting, tick('a', 'a1', 0), 90);

    expect(late.exercises[0]!.entries[0]!.done).toBe(true);
    expect(late.rest).toEqual(resting.rest);
  });

  it('follows superset rounds: no rest mid-round, then the round’s rest (spec 0029 AC-7)', () => {
    const start = workout(
      exercise('bench', [false, false], { supersetGroup: 1, restSeconds: 120 }),
      exercise('row', [false, false], { supersetGroup: 1, restSeconds: 60 }),
    );
    expect(toWatchSnapshot(start, 90).currentSet).toMatchObject({
      workoutSetId: 'bench1',
      restSeconds: 0,
    });

    const afterBench = applyWatchEvent(start, tick('bench', 'bench1', 0), 90);
    const offered = toWatchSnapshot(afterBench, 90);
    expect(afterBench.rest).toBeUndefined();
    expect(offered.restEndsAt).toBeUndefined();
    expect(offered.currentSet).toMatchObject({ workoutSetId: 'row1', restSeconds: 60 });

    const afterRow = applyWatchEvent(afterBench, tick('row', 'row1', 20), 90);
    expect(afterRow.rest).toEqual({ endsAt: at(80), totalSeconds: 60, workoutExerciseId: 'row' });
    expect(toWatchSnapshot(afterRow, 90).currentSet).toMatchObject({ workoutSetId: 'bench2' });
  });

  it('ends a rest on an early mid-round tick, but not one started after the tick (EF-6)', () => {
    const resting = applyWatchEvent(
      applyWatchEvent(
        workout(
          exercise('bench', [false, false], { supersetGroup: 1 }),
          exercise('row', [false, false], { supersetGroup: 1, restSeconds: 60 }),
        ),
        tick('bench', 'bench1', 0),
        90,
      ),
      tick('row', 'row1', 20),
      90,
    );

    const early = applyWatchEvent(resting, tick('bench', 'bench2', 30), 90);
    expect(early.rest).toBeUndefined();

    // Ticked on the watch before the phone's rest began, delivered after it.
    const late = applyWatchEvent(resting, tick('bench', 'bench2', 10), 90);
    expect(late.exercises[0]!.entries[1]!.done).toBe(true);
    expect(late.rest).toEqual(resting.rest);
  });

  it('ignores events for another workout', () => {
    const draft = workout(exercise('a', [false]));
    expect(applyWatchEvent(draft, tick('a', 'a1', 0, 'other'), 90)).toBe(draft);
  });

  it('pauses and resumes at the watch instants', () => {
    const draft = workout(exercise('a', [false]));
    const paused = applyWatchEvent(draft, { kind: 'pause', id: 'p', workoutSessionId: 'c1', at: at(0) }, 90);
    const resumed = applyWatchEvent(paused, { kind: 'resume', id: 'r', workoutSessionId: 'c1', at: at(45) }, 90);

    expect(paused.pausedAt).toBe(at(0));
    expect(resumed.pausedAt).toBeUndefined();
    expect(resumed.pausedSeconds).toBe(45);
    expect(applyWatchEvent(resumed, { kind: 'resume', id: 'r', workoutSessionId: 'c1', at: at(50) }, 90)).toBe(resumed);
  });

  it('leaves the draft alone for finish requests and calories', () => {
    const draft = workout(exercise('a', [false]));
    expect(applyWatchEvent(draft, { kind: 'finishRequested', id: 'f', workoutSessionId: 'c1' }, 90)).toBe(draft);
    expect(applyWatchEvent(draft, { kind: 'activeEnergy', workoutSessionId: 'c1', kcal: 120 }, 90)).toBe(draft);
  });
});
