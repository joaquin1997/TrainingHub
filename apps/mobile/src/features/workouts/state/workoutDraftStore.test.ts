import type { Routine } from '@workout/domain';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  addExerciseToWorkout,
  addSetToWorkoutExercise,
  applyLastPerformance,
  buildWorkoutSessionDraft,
  cycleWorkoutSetType,
  discardActiveWorkoutIfForeign,
  getActiveWorkoutOwnerId,
  hydrateActiveWorkout,
  removeExerciseFromWorkout,
  clearActiveWorkout,
  completeSet,
  countWorkoutSets,
  moveWorkoutExercise,
  moveWorkoutSet,
  adjustRest,
  pauseWorkout,
  resolveRestSeconds,
  restPhase,
  restRemainingSeconds,
  resumeWorkout,
  setExerciseRest,
  skipRest,
  startRest,
  totalPausedSeconds,
  removeSetFromWorkoutExercise,
  getActiveWorkout,
  hasActiveWorkout,
  isActiveWorkoutForRoutine,
  setActiveWorkout,
  startActiveWorkout,
  subscribeActiveWorkout,
  toCreateWorkoutSessionInput,
  toWorkoutSessionSkeleton,
  toggleWorkoutSetDone,
  type WorkoutSessionDraft,
} from './workoutDraftStore';

const routine: Routine = {
  id: 'routine-1',
  userId: 'u1',
  name: 'Push Day',
  exercises: [
    {
      id: 're-row',
      routineId: 'routine-1',
      exerciseId: 'ex-row',
      exerciseName: 'Row',
      orderIndex: 2,
      sets: [
        {
          id: 's-row-1',
          routineExerciseId: 're-row',
          setNumber: 1,
          targetWeight: 50,
          createdAt: '',
          updatedAt: '',
        },
      ],
      createdAt: '',
      updatedAt: '',
    },
    {
      id: 're-bench',
      routineId: 'routine-1',
      exerciseId: 'ex-bench',
      exerciseName: 'Bench',
      orderIndex: 1,
      sets: [
        {
          id: 's-bench-1',
          routineExerciseId: 're-bench',
          setNumber: 1,
          createdAt: '',
          updatedAt: '',
        },
      ],
      createdAt: '',
      updatedAt: '',
    },
  ],
  createdAt: '',
  updatedAt: '',
};

describe('buildWorkoutSessionDraft', () => {
  it('orders exercises by orderIndex and carries names + ids', () => {
    const draft = buildWorkoutSessionDraft(routine);

    expect(draft.routineId).toBe('routine-1');
    expect(draft.routineName).toBe('Push Day');
    expect(draft.exercises.map((exercise) => exercise.exerciseName)).toEqual([
      'Bench',
      'Row',
    ]);
    expect(draft.exercises[1]?.routineExerciseId).toBe('re-row');
  });

  it('leaves actual fields empty and ghosts the target weight as a placeholder', () => {
    const draft = buildWorkoutSessionDraft(routine);
    const rowSet = draft.exercises[1]?.entries[0];

    expect(rowSet?.weightKg).toBe('');
    expect(rowSet?.reps).toBe('');
    expect(rowSet?.weightPlaceholder).toBe('50');
  });
});

describe('workout identity (spec 0014)', () => {
  it('gives two workouts of the same routine different identities', () => {
    const first = buildWorkoutSessionDraft(routine);
    const second = buildWorkoutSessionDraft(routine);

    expect(first.id).toBe(second.id);
    expect(first.clientId).not.toBe(second.clientId);
    expect(first.clientId).toMatch(/^[0-9a-z]+-[0-9a-z]{8}$/);
  });

  it('keeps the identity across edits and sends it with the save', () => {
    const draft = buildWorkoutSessionDraft(routine);
    const set = draft.exercises[0]!.entries[0]!;
    const edited = toggleWorkoutSetDone(draft, draft.exercises[0]!.id, set.id);

    expect(edited.clientId).toBe(draft.clientId);
    expect(toCreateWorkoutSessionInput(edited).clientId).toBe(draft.clientId);
  });
});

describe('toCreateWorkoutSessionInput', () => {
  it('coerces logged strings to numbers and drops empties', () => {
    const draft: WorkoutSessionDraft = {
      id: 'w1',
      clientId: 'c1',
      routineId: 'routine-1',
      routineName: 'Push Day',
      startedAt: '2026-05-30T09:00:00.000Z',
      exercises: [
        {
          id: 'we-1',
          exerciseId: 'ex-bench',
          exerciseName: 'Bench',
          routineExerciseId: 're-bench',
          order: 1,
          entries: [
            { id: 's1', order: 1, reps: '8', weightKg: '60', done: false, type: 'normal' },
            { id: 's2', order: 2, reps: '', weightKg: '', done: false, type: 'normal' },
          ],
        },
      ],
    };

    const input = toCreateWorkoutSessionInput(draft);

    expect(input.routineId).toBe('routine-1');
    expect(input.startedAt).toBe('2026-05-30T09:00:00.000Z');
    expect(typeof input.completedAt).toBe('string');
    expect(input.exercises[0]?.sets).toEqual([
      { order: 1, reps: 8, weightKg: 60, type: 'normal' },
      { order: 2, reps: undefined, weightKg: undefined, type: 'normal' },
    ]);
  });

  it('logs the ghosted placeholder when the actual field is left empty', () => {
    const draft: WorkoutSessionDraft = {
      id: 'w1',
      clientId: 'c1',
      routineId: 'routine-1',
      routineName: 'Push Day',
      startedAt: '2026-05-30T09:00:00.000Z',
      exercises: [
        {
          id: 'we-1',
          exerciseId: 'ex-bench',
          exerciseName: 'Bench',
          order: 1,
          entries: [
            {
              id: 's1',
              order: 1,
              reps: '',
              weightKg: '',
              repsPlaceholder: '10',
              weightPlaceholder: '50',
              done: true,
              type: 'normal',
            },
            {
              id: 's2',
              order: 2,
              reps: '8',
              weightKg: '',
              repsPlaceholder: '10',
              weightPlaceholder: '60',
              done: true,
              type: 'normal',
            },
          ],
        },
      ],
    };

    const sets = toCreateWorkoutSessionInput(draft).exercises[0]!.sets;

    // s1: both empty -> falls back to placeholders.
    expect(sets[0]).toMatchObject({ reps: 10, weightKg: 50 });
    // s2: reps edited, weight empty -> edited reps + placeholder weight.
    expect(sets[1]).toMatchObject({ reps: 8, weightKg: 60 });
  });

  it('converts lb input back to canonical kg on persist', () => {
    const draft: WorkoutSessionDraft = {
      id: 'w1',
      clientId: 'c1',
      routineId: 'routine-1',
      routineName: 'Push Day',
      startedAt: '2026-05-30T09:00:00.000Z',
      unit: 'lb',
      exercises: [
        {
          id: 'we-1',
          exerciseId: 'ex-bench',
          exerciseName: 'Bench',
          order: 1,
          entries: [
            { id: 's1', order: 1, reps: '8', weightKg: '220.5', done: true, type: 'normal' },
          ],
        },
      ],
    };

    const set = toCreateWorkoutSessionInput(draft).exercises[0]!.sets[0]!;
    // 220.5 lb -> 100 kg.
    expect(set.weightKg).toBe(100);
  });

  it('ghosts the routine target weight in the session unit', () => {
    const draft = buildWorkoutSessionDraft(routine, 'lb'); // Row target 50 kg
    const rowSet = draft.exercises[1]?.entries[0];

    // 50 kg -> 110.2 lb shown as the placeholder.
    expect(rowSet?.weightPlaceholder).toBe('110.2');
  });

  it('stamps completedAt on sets marked done', () => {
    const draft: WorkoutSessionDraft = {
      id: 'w1',
      clientId: 'c1',
      routineId: 'routine-1',
      routineName: 'Push Day',
      startedAt: '2026-05-30T09:00:00.000Z',
      exercises: [
        {
          id: 'we-1',
          exerciseId: 'ex-bench',
          exerciseName: 'Bench',
          order: 1,
          entries: [
            { id: 's1', order: 1, reps: '8', weightKg: '60', done: true, type: 'normal' },
            { id: 's2', order: 2, reps: '6', weightKg: '65', done: false, type: 'normal' },
          ],
        },
      ],
    };

    const input = toCreateWorkoutSessionInput(draft);
    const sets = input.exercises[0]!.sets;

    expect(sets[0]!.completedAt).toBe(input.completedAt);
    expect(sets[1]!.completedAt).toBeUndefined();
  });
});

describe('active workout state', () => {
  const otherRoutine: Routine = { ...routine, id: 'routine-2', name: 'Pull Day' };

  beforeEach(() => {
    clearActiveWorkout();
  });

  it('starts and exposes an active workout for a routine', () => {
    const started = startActiveWorkout(routine);

    expect(hasActiveWorkout()).toBe(true);
    expect(getActiveWorkout()).toBe(started);
    expect(isActiveWorkoutForRoutine('routine-1')).toBe(true);
    expect(isActiveWorkoutForRoutine('routine-2')).toBe(false);
  });

  it('resumes the same routine without rebuilding', () => {
    const started = startActiveWorkout(routine);
    const edited: WorkoutSessionDraft = { ...started, routineName: 'Edited' };
    setActiveWorkout(edited);

    const resumed = startActiveWorkout(routine);

    expect(resumed).toBe(edited);
    expect(resumed.routineName).toBe('Edited');
  });

  it('replaces the active workout when starting a different routine', () => {
    startActiveWorkout(routine);
    const next = startActiveWorkout(otherRoutine);

    expect(next.routineId).toBe('routine-2');
    expect(isActiveWorkoutForRoutine('routine-2')).toBe(true);
  });

  it('clears the active workout', () => {
    startActiveWorkout(routine);
    clearActiveWorkout();

    expect(hasActiveWorkout()).toBe(false);
    expect(getActiveWorkout()).toBeNull();
  });
});

describe('set completion', () => {
  it('builds sets as not done and toggles a single set', () => {
    const draft = buildWorkoutSessionDraft(routine);
    const exercise = draft.exercises[0]!;
    const setId = exercise.entries[0]!.id;

    expect(exercise.entries[0]!.done).toBe(false);

    const toggled = toggleWorkoutSetDone(draft, exercise.id, setId);
    expect(toggled.exercises[0]!.entries[0]!.done).toBe(true);

    const back = toggleWorkoutSetDone(toggled, exercise.id, setId);
    expect(back.exercises[0]!.entries[0]!.done).toBe(false);
  });

  it('counts done vs total sets', () => {
    const draft = buildWorkoutSessionDraft(routine);
    const exercise = draft.exercises[0]!;
    const toggled = toggleWorkoutSetDone(draft, exercise.id, exercise.entries[0]!.id);

    expect(countWorkoutSets(draft)).toEqual({ done: 0, total: 2 });
    expect(countWorkoutSets(toggled)).toEqual({ done: 1, total: 2 });
  });
});

describe('add / remove sets', () => {
  it('appends an empty set, ghosting the previous set values as placeholders', () => {
    const draft = buildWorkoutSessionDraft(routine);
    const exerciseId = draft.exercises[1]!.id; // Row, has a set with target 50

    const next = addSetToWorkoutExercise(draft, exerciseId);
    const entries = next.exercises[1]!.entries;

    expect(entries).toHaveLength(2);
    expect(entries[1]!.order).toBe(2);
    expect(entries[1]!.reps).toBe('');
    expect(entries[1]!.weightKg).toBe('');
    expect(entries[1]!.weightPlaceholder).toBe('50');
    expect(entries[1]!.done).toBe(false);
  });

  it('removes a set and renumbers the rest', () => {
    const draft = buildWorkoutSessionDraft(routine);
    const exerciseId = draft.exercises[1]!.id;
    const withTwo = addSetToWorkoutExercise(draft, exerciseId);
    const firstSetId = withTwo.exercises[1]!.entries[0]!.id;

    const next = removeSetFromWorkoutExercise(withTwo, exerciseId, firstSetId);
    const entries = next.exercises[1]!.entries;

    expect(entries).toHaveLength(1);
    expect(entries[0]!.order).toBe(1);
  });
});

describe('applyLastPerformance', () => {
  it('ghosts last-performance values as placeholders without touching actuals', () => {
    const draft = buildWorkoutSessionDraft(routine);
    const rowExerciseId = 'ex-row'; // Row, one set at order 1

    const next = applyLastPerformance(draft, rowExerciseId, {
      performedAt: '2026-05-29T09:00:00.000Z',
      sets: [{ order: 1, reps: 12, weightKg: 55 }],
    });

    const rowSet = next.exercises.find((e) => e.exerciseId === rowExerciseId)!
      .entries[0]!;
    expect(rowSet.repsPlaceholder).toBe('12');
    expect(rowSet.weightPlaceholder).toBe('55');
    // Actual entry fields stay empty.
    expect(rowSet.reps).toBe('');
    expect(rowSet.weightKg).toBe('');
  });

  it('returns the same reference when nothing changes', () => {
    const draft = buildWorkoutSessionDraft(routine);

    const unchanged = applyLastPerformance(draft, 'ex-row', {
      performedAt: '2026-05-29T09:00:00.000Z',
      sets: [{ order: 99, reps: 5, weightKg: 5 }], // no matching set order
    });

    expect(unchanged).toBe(draft);
  });
});

describe('reorder', () => {
  it('moves an exercise down and renumbers order', () => {
    const draft = buildWorkoutSessionDraft(routine); // [Bench, Row]
    const benchId = draft.exercises[0]!.id;

    const next = moveWorkoutExercise(draft, benchId, 'down');

    expect(next.exercises.map((e) => e.exerciseName)).toEqual(['Row', 'Bench']);
    expect(next.exercises.map((e) => e.order)).toEqual([1, 2]);
  });

  it('is a no-op when moving the first exercise up', () => {
    const draft = buildWorkoutSessionDraft(routine);
    const benchId = draft.exercises[0]!.id;

    const next = moveWorkoutExercise(draft, benchId, 'up');

    expect(next.exercises.map((e) => e.exerciseName)).toEqual(['Bench', 'Row']);
  });

  it('moves a set within an exercise', () => {
    const draft = buildWorkoutSessionDraft(routine);
    const exerciseId = draft.exercises[1]!.id;
    const withTwo = addSetToWorkoutExercise(draft, exerciseId);
    const secondSetId = withTwo.exercises[1]!.entries[1]!.id;

    const next = moveWorkoutSet(withTwo, exerciseId, secondSetId, 'up');
    const entries = next.exercises[1]!.entries;

    expect(entries[0]!.id).toBe(secondSetId);
    expect(entries.map((s) => s.order)).toEqual([1, 2]);
  });
});

describe('add / remove exercises', () => {
  it('appends an exercise with one empty set and order at the end', () => {
    const draft = buildWorkoutSessionDraft(routine); // 2 exercises

    const next = addExerciseToWorkout(draft, { id: 'ex-squat', name: 'Squat' });

    expect(next.exercises).toHaveLength(3);
    const added = next.exercises[2]!;
    expect(added.exerciseName).toBe('Squat');
    expect(added.exerciseId).toBe('ex-squat');
    expect(added.order).toBe(3);
    expect(added.entries).toHaveLength(1);
    expect(added.entries[0]!.reps).toBe('');
  });

  it('removes an exercise and renumbers order', () => {
    const draft = buildWorkoutSessionDraft(routine);
    const firstId = draft.exercises[0]!.id;

    const next = removeExerciseFromWorkout(draft, firstId);

    expect(next.exercises).toHaveLength(1);
    expect(next.exercises[0]!.order).toBe(1);
  });
});

describe('set type', () => {
  it('builds sets as normal and cycles type', () => {
    const draft = buildWorkoutSessionDraft(routine);
    const exercise = draft.exercises[0]!;
    const setId = exercise.entries[0]!.id;

    expect(exercise.entries[0]!.type).toBe('normal');

    const warmup = cycleWorkoutSetType(draft, exercise.id, setId);
    expect(warmup.exercises[0]!.entries[0]!.type).toBe('warmup');

    const drop = cycleWorkoutSetType(warmup, exercise.id, setId);
    expect(drop.exercises[0]!.entries[0]!.type).toBe('drop');
  });
});

describe('toWorkoutSessionSkeleton', () => {
  const draftWith = (unit: 'kg' | 'lb'): WorkoutSessionDraft => ({
    id: 'w1',
    clientId: 'c1',
    routineId: 'routine-1',
    routineName: 'Push Day',
    startedAt: '2026-05-30T09:00:00.000Z',
    unit,
    exercises: [
      {
        id: 'we-1',
        exerciseId: 'ex-bench',
        exerciseName: 'Bench',
        routineExerciseId: 're-bench',
        order: 1,
        entries: [
          {
            id: 's1',
            order: 1,
            reps: '',
            weightKg: '',
            repsPlaceholder: '8',
            weightPlaceholder: '100',
            done: true,
            type: 'normal',
          },
          { id: 's2', order: 2, reps: '', weightKg: '', done: false, type: 'normal' },
        ],
      },
    ],
  });

  it('carries the values that get saved, placeholders included (spec 0013 FR-6)', () => {
    const sets = toWorkoutSessionSkeleton(draftWith('kg')).exercises[0]?.sets;

    expect(sets?.map((set) => [set.reps, set.weightKg])).toEqual([
      [8, 100],
      [undefined, undefined],
    ]);
  });

  it('converts a placeholder typed in lb to canonical kg', () => {
    const set = toWorkoutSessionSkeleton(draftWith('lb')).exercises[0]?.sets[0];

    expect(set?.weightKg).toBeCloseTo(45.36, 1);
  });
});

describe('generated draft ids (spec 0010)', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.resetModules();
  });

  async function firstGeneratedSetId(now: string) {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(now));
    vi.resetModules();
    const store = await import('./workoutDraftStore');
    const draft = store.buildWorkoutSessionDraft(routine);
    const exerciseId = draft.exercises[0]!.id;
    const withSet = store.addSetToWorkoutExercise(draft, exerciseId);
    return withSet.exercises[0]!.entries.at(-1)!.id;
  }

  it('do not repeat after an app restart', async () => {
    const beforeRestart = await firstGeneratedSetId('2026-10-16T09:00:00.000Z');
    const afterRestart = await firstGeneratedSetId('2026-10-16T09:20:00.000Z');

    expect(beforeRestart).not.toBe(afterRestart);
  });
});

describe('subscribeActiveWorkout (spec 0010)', () => {
  beforeEach(() => {
    clearActiveWorkout();
  });

  it('notifies on start, set and clear, and stops after unsubscribe', () => {
    const calls: Array<string | null> = [];
    const unsubscribe = subscribeActiveWorkout(() => {
      calls.push(getActiveWorkout()?.routineId ?? null);
    });

    const draft = startActiveWorkout(routine);
    setActiveWorkout({ ...draft, notes: 'heavy day' });
    clearActiveWorkout();
    unsubscribe();
    startActiveWorkout(routine);

    expect(calls).toEqual(['routine-1', 'routine-1', null]);
  });

  it('does not notify when resuming the same routine or clearing nothing', () => {
    let calls = 0;
    startActiveWorkout(routine);
    const unsubscribe = subscribeActiveWorkout(() => {
      calls += 1;
    });

    startActiveWorkout(routine);
    clearActiveWorkout();
    clearActiveWorkout();
    unsubscribe();

    expect(calls).toBe(1);
  });
});

describe('active workout owner (spec 0010)', () => {
  beforeEach(() => {
    clearActiveWorkout();
  });

  it('keeps the workout when its owner signs in again', () => {
    startActiveWorkout(routine, 'kg', 'user-a');
    discardActiveWorkoutIfForeign('user-a');

    expect(hasActiveWorkout()).toBe(true);
  });

  it('discards a workout started by someone else', () => {
    startActiveWorkout(routine, 'kg', 'user-a');
    discardActiveWorkoutIfForeign('user-b');

    expect(hasActiveWorkout()).toBe(false);
    expect(getActiveWorkoutOwnerId()).toBeNull();
  });

  it('adopts a workout with no recorded owner', () => {
    startActiveWorkout(routine);
    discardActiveWorkoutIfForeign('user-a');

    expect(hasActiveWorkout()).toBe(true);
    expect(getActiveWorkoutOwnerId()).toBe('user-a');
  });

  it('records the owner of a restored workout', () => {
    hydrateActiveWorkout(buildWorkoutSessionDraft(routine), 'user-a');

    expect(getActiveWorkoutOwnerId()).toBe('user-a');
    discardActiveWorkoutIfForeign('user-b');
    expect(hasActiveWorkout()).toBe(false);
  });
});

describe('pause (spec 0011)', () => {
  const at = (minutes: number) => new Date(Date.UTC(2026, 9, 16, 9, minutes));
  const started = () => ({ ...buildWorkoutSessionDraft(routine), startedAt: at(0).toISOString() });

  it('accumulates paused time across pause/resume cycles', () => {
    let draft = started();
    draft = pauseWorkout(draft, at(10));
    draft = resumeWorkout(draft, at(15));
    draft = pauseWorkout(draft, at(30));
    draft = resumeWorkout(draft, at(32));

    expect(draft.pausedAt).toBeUndefined();
    expect(draft.pausedSeconds).toBe(7 * 60);
  });

  it('ignores pausing twice or resuming while running', () => {
    const running = started();
    const paused = pauseWorkout(running, at(5));

    expect(pauseWorkout(paused, at(8))).toBe(paused);
    expect(resumeWorkout(running, at(8))).toBe(running);
  });

  it('counts a pause still in progress', () => {
    const draft = pauseWorkout({ ...started(), pausedSeconds: 60 }, at(20));

    expect(totalPausedSeconds(draft, at(30))).toBe(60 + 10 * 60);
  });

  it('sends the paused time, an ongoing pause included, when finishing paused', () => {
    vi.useFakeTimers();
    vi.setSystemTime(at(60));
    const draft = pauseWorkout(resumeWorkout(pauseWorkout(started(), at(10)), at(20)), at(50));

    expect(toCreateWorkoutSessionInput(draft).pausedSeconds).toBe(20 * 60);
    vi.useRealTimers();
  });

  it('never sends more paused time than the workout lasted', () => {
    vi.useFakeTimers();
    vi.setSystemTime(at(30));
    const draft = { ...started(), pausedSeconds: 99 * 60 };

    expect(toCreateWorkoutSessionInput(draft).pausedSeconds).toBe(30 * 60);
    vi.useRealTimers();
  });
});

describe('rest timer (spec 0018)', () => {
  const at = (seconds: number) => new Date(Date.UTC(2026, 9, 16, 9, 0, seconds));
  const fresh = () => buildWorkoutSessionDraft(routine);

  it('resolves the rest: set in the workout, else the routine, else the default (FR-1)', () => {
    expect(resolveRestSeconds({ restSeconds: 210 }, 90)).toBe(210);
    expect(resolveRestSeconds({ restSeconds: 0 }, 90)).toBe(0);
    expect(resolveRestSeconds({}, 90)).toBe(90);
  });

  it('changes one exercise rest without touching others, the routine or a running rest (FR-2, AC-1)', () => {
    const base = fresh();
    const [first, second] = base.exercises;
    const resting = startRest(
      { ...base, exercises: [{ ...first!, restSeconds: 120 }, second!] },
      first!.id,
      120,
      at(0),
    );

    const changed = setExerciseRest(resting, first!.id, 210);

    expect(changed.exercises[0]!.restSeconds).toBe(210);
    expect(changed.exercises[1]).toBe(resting.exercises[1]);
    expect(changed.rest).toEqual(resting.rest);
    expect(resolveRestSeconds(changed.exercises[0]!, 90)).toBe(210);
    expect(routine.exercises.every((exercise) => exercise.restSeconds === undefined)).toBe(true);
  });

  it('starts a rest with an absolute end, replacing a running one', () => {
    const first = startRest(fresh(), 'we-a', 90, at(0));
    const second = startRest(first, 'we-b', 60, at(10));

    expect(first.rest).toEqual({ endsAt: at(90).toISOString(), totalSeconds: 90, workoutExerciseId: 'we-a' });
    expect(second.rest).toEqual({ endsAt: at(70).toISOString(), totalSeconds: 60, workoutExerciseId: 'we-b' });
  });

  it('starts nothing for a rest of 0 seconds', () => {
    const draft = fresh();

    expect(startRest(draft, 'we-a', 0, at(0))).toBe(draft);
  });

  it('adjusts only the running rest, never earlier than now (FR-3)', () => {
    const draft = startRest(fresh(), 'we-a', 60, at(0));

    const longer = adjustRest(draft, 15, at(10));
    expect(longer.rest).toEqual({ endsAt: at(75).toISOString(), totalSeconds: 75, workoutExerciseId: 'we-a' });
    expect(longer.exercises).toBe(draft.exercises);

    const shorter = adjustRest(draft, -15, at(50));
    expect(shorter.rest?.endsAt).toBe(at(50).toISOString());
    expect(restRemainingSeconds(shorter.rest!, at(50))).toBe(0);
    expect(adjustRest(fresh(), 15, at(0)).rest).toBeUndefined();
  });

  it('skips the running rest', () => {
    const draft = startRest(fresh(), 'we-a', 60, at(0));

    expect(skipRest(draft).rest).toBeUndefined();
    expect(skipRest(draft).exercises).toBe(draft.exercises);
  });

  it('tells running, just ended and stale apart', () => {
    const rest = startRest(fresh(), 'we-a', 60, at(0)).rest!;

    expect(restPhase(rest, at(59))).toBe('running');
    expect(restPhase(rest, at(60))).toBe('ended');
    expect(restPhase(rest, at(62))).toBe('ended');
    expect(restPhase(rest, at(63))).toBe('stale');
    expect(restRemainingSeconds(rest, at(15))).toBe(45);
  });
});

describe('completeSet (spec 0018 FR-1, spec 0025)', () => {
  const at = (seconds: number) => new Date(Date.UTC(2026, 9, 17, 9, 0, seconds));

  it('ticks the set and starts the exercise rest from the given instant', () => {
    const base = buildWorkoutSessionDraft(routine);
    const bench = base.exercises[0]!;
    const draft = { ...base, exercises: [{ ...bench, restSeconds: 120 }, base.exercises[1]!] };

    const next = completeSet(draft, bench.id, bench.entries[0]!.id, 90, at(10));

    expect(next.exercises[0]!.entries[0]).toMatchObject({ done: true, restSeconds: 120 });
    expect(next.rest).toEqual({
      endsAt: at(130).toISOString(),
      totalSeconds: 120,
      workoutExerciseId: bench.id,
    });
  });

  it('falls back to the default rest', () => {
    const base = buildWorkoutSessionDraft(routine);
    const bench = base.exercises[0]!;

    const next = completeSet(base, bench.id, bench.entries[0]!.id, 90, at(0));

    expect(next.rest?.totalSeconds).toBe(90);
  });

  it('leaves a done or unknown set as it is (EF-1)', () => {
    const base = buildWorkoutSessionDraft(routine);
    const bench = base.exercises[0]!;
    const once = completeSet(base, bench.id, bench.entries[0]!.id, 90, at(0));

    expect(completeSet(once, bench.id, bench.entries[0]!.id, 90, at(30))).toBe(once);
    expect(completeSet(base, bench.id, 'nope', 90, at(0))).toBe(base);
    expect(completeSet(base, 'nope', bench.entries[0]!.id, 90, at(0))).toBe(base);
  });
});
