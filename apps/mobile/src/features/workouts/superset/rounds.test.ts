import { describe, expect, it } from 'vitest';

import { currentSetToDo } from '@/features/workouts/restTimer/nextSetToDo';
import {
  toggleWorkoutSetDone,
  type WorkoutExerciseDraft,
  type WorkoutSessionDraft,
} from '@/features/workouts/state/workoutDraftStore';
import type { WorkoutSetType } from '@workout/domain';

import {
  completeSetInRounds,
  restAfterTick,
  restOwner,
  roundStatus,
} from './rounds';

const NOW = new Date('2026-10-17T10:00:00.000Z');
const DEFAULT_REST = 90;

/** `sets`: one letter per set — 'w' warm-up, 'n' working. */
const exercise = (
  id: string,
  sets: string,
  options: { group?: number; rest?: number } = {},
): WorkoutExerciseDraft => ({
  id,
  exerciseId: `ex-${id}`,
  exerciseName: id,
  supersetGroup: options.group,
  restSeconds: options.rest,
  order: 0,
  entries: [...sets].map((kind, i) => {
    const type: WorkoutSetType = kind === 'w' ? 'warmup' : 'normal';
    const working = [...sets].slice(0, i + 1).filter((k) => k !== 'w').length;
    return {
      id: kind === 'w' ? `${id}-w${i + 1}` : `${id}${working}`,
      order: i + 1,
      reps: '',
      weightKg: '',
      done: false,
      type,
    };
  }),
});

const workout = (...exercises: WorkoutExerciseDraft[]): WorkoutSessionDraft => ({
  id: 'w',
  clientId: 'c',
  routineId: 'r',
  routineName: 'R',
  startedAt: '2026-10-17T09:00:00.000Z',
  exercises,
});

const exerciseOf = (setId: string) => setId.replace(/(-w)?\d+$/, '');

/** Ticks sets in order, counting the rests that start; returns the final draft. */
function tick(draft: WorkoutSessionDraft, ...setIds: string[]) {
  let current = draft;
  const rests: Array<{ owner: string; seconds: number } | null> = [];
  for (const setId of setIds) {
    const before = current.rest;
    current = completeSetInRounds(current, exerciseOf(setId), setId, DEFAULT_REST, NOW);
    rests.push(
      current.rest && current.rest !== before
        ? { owner: current.rest.workoutExerciseId, seconds: current.rest.totalSeconds }
        : null,
    );
  }
  return { draft: current, rests };
}

const benchAndRow = () =>
  workout(
    exercise('bench', 'nnnn', { group: 1, rest: 120 }),
    exercise('row', 'nnnn', { group: 1, rest: 60 }),
  );

describe('completeSetInRounds — rest once per round (spec 0029)', () => {
  it('starts no rest mid-round and the last exercise’s rest after it (AC-1)', () => {
    const afterBench = tick(benchAndRow(), 'bench1');
    expect(afterBench.rests).toEqual([null]);
    expect(afterBench.draft.rest).toBeUndefined();
    expect(currentSetToDo(afterBench.draft)).toEqual({
      workoutExerciseId: 'row',
      workoutSetId: 'row1',
    });

    const afterRow = tick(afterBench.draft, 'row1');
    expect(afterRow.rests).toEqual([{ owner: 'row', seconds: 60 }]);
    expect(currentSetToDo(afterRow.draft)).toEqual({
      workoutExerciseId: 'bench',
      workoutSetId: 'bench2',
    });
  });

  it('starts exactly four rests over four rounds (AC-2)', () => {
    const { rests } = tick(
      benchAndRow(),
      'bench1', 'row1', 'bench2', 'row2', 'bench3', 'row3', 'bench4', 'row4',
    );
    expect(rests.filter(Boolean)).toHaveLength(4);
  });

  it('rests with the exercise that has a set in the last round (AC-3)', () => {
    const draft = workout(
      exercise('curl', 'nnnn', { group: 1, rest: 90 }),
      exercise('pushdown', 'nnn', { group: 1, rest: 60 }),
    );
    const { draft: done, rests } = tick(
      draft,
      'curl1', 'pushdown1', 'curl2', 'pushdown2', 'curl3', 'pushdown3', 'curl4',
    );
    expect(rests.filter(Boolean)).toEqual([
      { owner: 'pushdown', seconds: 60 },
      { owner: 'pushdown', seconds: 60 },
      { owner: 'pushdown', seconds: 60 },
      { owner: 'curl', seconds: 90 },
    ]);
    expect(roundStatus(done.exercises)).toEqual({ current: null, total: 4 });
  });

  it('runs a tri-set A → B → C, then rest (AC-4)', () => {
    const draft = workout(
      exercise('A', 'nnn', { group: 1, rest: 30 }),
      exercise('B', 'nnn', { group: 1, rest: 40 }),
      exercise('C', 'nnn', { group: 1, rest: 50 }),
    );
    const { draft: after, rests } = tick(draft, 'A1', 'B1', 'C1');
    expect(rests).toEqual([null, null, { owner: 'C', seconds: 50 }]);
    expect(roundStatus(after.exercises)).toEqual({ current: 2, total: 3 });
  });

  it('starts the rest on whichever set completes the round (AC-5)', () => {
    const { rests } = tick(benchAndRow(), 'row1', 'bench1');
    expect(rests).toEqual([null, { owner: 'row', seconds: 60 }]);
  });

  it('ends a running rest quietly on an early tick (AC-6, FR-4)', () => {
    const resting = tick(benchAndRow(), 'bench1', 'row1').draft;
    expect(resting.rest).toBeDefined();

    const early = tick(resting, 'bench2').draft;
    expect(early.rest).toBeUndefined();
    expect(currentSetToDo(early)).toEqual({ workoutExerciseId: 'row', workoutSetId: 'row2' });
  });

  it('lets a later round never complete an earlier one (EF-2)', () => {
    const { rests } = tick(benchAndRow(), 'row2', 'bench2', 'bench1');
    expect(rests).toEqual([null, { owner: 'row', seconds: 60 }, null]);
  });

  it('starts nothing when the rest that applies is off (EF-1)', () => {
    const draft = workout(
      exercise('A', 'nn', { group: 1, rest: 60 }),
      exercise('B', 'nn', { group: 1, rest: 0 }),
    );
    const { draft: after, rests } = tick(draft, 'A1', 'B1');
    expect(rests).toEqual([null, null]);
    expect(currentSetToDo(after)).toEqual({ workoutExerciseId: 'A', workoutSetId: 'A2' });
  });

  it('rests after the last round of the whole superset (EF-3)', () => {
    const draft = workout(
      exercise('A', 'n', { group: 1, rest: 60 }),
      exercise('B', 'n', { group: 1, rest: 45 }),
      exercise('C', 'n'),
    );
    const { draft: after, rests } = tick(draft, 'A1', 'B1');
    expect(rests).toEqual([null, { owner: 'B', seconds: 45 }]);
    expect(currentSetToDo(after)).toEqual({ workoutExerciseId: 'C', workoutSetId: 'C1' });
  });

  it('gives warm-ups their own rest, outside rounds (AC-11, FR-9)', () => {
    const draft = workout(
      exercise('A', 'wwnn', { group: 1, rest: 60 }),
      exercise('B', 'nn', { group: 1, rest: 45 }),
    );
    const { draft: after, rests } = tick(draft, 'A-w1', 'A-w2');
    expect(rests).toEqual([
      { owner: 'A', seconds: 60 },
      { owner: 'A', seconds: 60 },
    ]);
    expect(currentSetToDo(after)).toEqual({ workoutExerciseId: 'A', workoutSetId: 'A1' });
    expect(tick(after, 'A1').rests).toEqual([null]);
  });

  it('keeps today’s rule outside a superset (FR-6)', () => {
    const draft = workout(exercise('A', 'nn', { rest: 75 }), exercise('B', 'nn'));
    expect(tick(draft, 'A1', 'B1').rests).toEqual([
      { owner: 'A', seconds: 75 },
      { owner: 'B', seconds: DEFAULT_REST },
    ]);
  });

  it('treats a superset left with one exercise as a normal exercise', () => {
    const draft = workout(exercise('A', 'nn', { group: 1, rest: 30 }), exercise('B', 'nn'));
    expect(tick(draft, 'A1').rests).toEqual([{ owner: 'A', seconds: 30 }]);
  });

  it('records the rest that followed the set', () => {
    const { draft } = tick(benchAndRow(), 'bench1', 'row1');
    const sets = draft.exercises.flatMap((item) => item.entries);
    expect(sets.find((set) => set.id === 'bench1')?.restSeconds).toBe(0);
    expect(sets.find((set) => set.id === 'row1')?.restSeconds).toBe(60);
  });

  it('ignores a set already done, and an un-tick never starts a rest (FR-5)', () => {
    const once = tick(benchAndRow(), 'bench1', 'row1').draft;
    expect(completeSetInRounds(once, 'row', 'row1', DEFAULT_REST, NOW)).toBe(once);

    const unticked = toggleWorkoutSetDone(once, 'bench', 'bench1');
    expect(unticked.rest).toBe(once.rest);
  });

  it('resumes the same way after the draft is stored and restored (EF-5)', () => {
    const midRound = tick(benchAndRow(), 'bench1', 'row1', 'bench2').draft;
    const restored = JSON.parse(JSON.stringify(midRound)) as WorkoutSessionDraft;

    expect(currentSetToDo(restored)).toEqual(currentSetToDo(midRound));
    expect(tick(restored, 'row2').rests).toEqual([{ owner: 'row', seconds: 60 }]);
  });

  it('recomputes rounds when a set is added (FR-23)', () => {
    const draft = workout(
      exercise('A', 'nn', { group: 1, rest: 60 }),
      exercise('B', 'n', { group: 1, rest: 45 }),
    );
    const { draft: after } = tick(draft, 'A1', 'B1', 'A2');
    expect(roundStatus(after.exercises)).toEqual({ current: null, total: 2 });
  });
});

describe('restAfterTick', () => {
  it('is what the tick would start', () => {
    const draft = benchAndRow();
    expect(restAfterTick(draft, 'bench', 'bench1', DEFAULT_REST)).toBe(0);
    const afterBench = tick(draft, 'bench1').draft;
    expect(restAfterTick(afterBench, 'row', 'row1', DEFAULT_REST)).toBe(60);
    expect(restAfterTick(draft, 'gone', 'x', DEFAULT_REST)).toBe(0);
  });
});

describe('restOwner', () => {
  it('is the last listed exercise with a set in the round', () => {
    const members = [exercise('A', 'nnn'), exercise('B', 'nn')];
    expect(restOwner(members, 1)?.id).toBe('B');
    expect(restOwner(members, 2)?.id).toBe('A');
  });
});
