import type { Routine } from '@workout/domain';
import { describe, expect, it } from 'vitest';

import { toggleWarmUpItem } from './warmUpDraft';
import {
  buildWorkoutSessionDraft,
  completeSet,
  countWorkoutSets,
  toCreateWorkoutSessionInput,
} from './workoutDraftStore';

const at = '2026-10-17T08:00:00.000Z';

const routine: Routine = {
  id: 'r1',
  userId: 'u1',
  name: 'Legs',
  warmUpItems: [
    { order: 2, name: '15 band pull-aparts', targetReps: 15 },
    { order: 1, name: '5 min bike', targetDurationSeconds: 300 },
  ],
  exercises: [
    {
      id: 're-1',
      routineId: 'r1',
      exerciseId: 'ex-squat',
      exerciseName: 'Squat',
      orderIndex: 1,
      sets: [
        { id: 's1', routineExerciseId: 're-1', setNumber: 1, targetWeight: 100, maxReps: 5, createdAt: at, updatedAt: at },
        { id: 's2', routineExerciseId: 're-1', setNumber: 2, targetWeight: 100, maxReps: 5, createdAt: at, updatedAt: at },
      ],
      createdAt: at,
      updatedAt: at,
    },
  ],
  createdAt: at,
  updatedAt: at,
};

describe('warm-up block in the workout (spec 0024)', () => {
  it('lists the routine block first, in order, nothing ticked (AC-3)', () => {
    const draft = buildWorkoutSessionDraft(routine);

    expect(draft.warmUp?.map((item) => [item.name, item.done])).toEqual([
      ['5 min bike', false],
      ['15 band pull-aparts', false],
    ]);
  });

  it('has no block when the routine has none', () => {
    expect(buildWorkoutSessionDraft({ ...routine, warmUpItems: [] }).warmUp).toBeUndefined();
    expect(buildWorkoutSessionDraft({ ...routine, warmUpItems: undefined }).warmUp).toBeUndefined();
  });

  it('ticking changes neither the sets done, the sets nor the rest (AC-3, FR-6)', () => {
    const draft = buildWorkoutSessionDraft(routine);
    const ticked = toggleWarmUpItem(
      toggleWarmUpItem(draft, draft.warmUp![0]!.id),
      draft.warmUp![1]!.id,
    );

    expect(ticked.warmUp?.every((item) => item.done)).toBe(true);
    expect(countWorkoutSets(ticked)).toEqual(countWorkoutSets(draft));
    expect(ticked.exercises).toBe(draft.exercises);
    expect(ticked.rest).toBeUndefined();
    expect(toggleWarmUpItem(ticked, ticked.warmUp![0]!.id).warmUp![0]!.done).toBe(false);
  });

  it('leaves the workout as it is for an unknown item', () => {
    const draft = buildWorkoutSessionDraft(routine);
    expect(toggleWarmUpItem(draft, 'nope')).toBe(draft);
  });

  it('saves every item with whether it was done (FR-7); volume only from sets', () => {
    const draft = buildWorkoutSessionDraft(routine);
    const exercise = draft.exercises[0]!;
    const next = completeSet(
      toggleWarmUpItem(draft, draft.warmUp![0]!.id),
      exercise.id,
      exercise.entries[0]!.id,
      90,
    );

    const input = toCreateWorkoutSessionInput(next);

    expect(input.warmUpItems).toEqual([
      { name: '5 min bike', targetDurationSeconds: 300, targetReps: undefined, done: true },
      { name: '15 band pull-aparts', targetDurationSeconds: undefined, targetReps: 15, done: false },
    ]);
    expect(input.exercises[0]!.sets.filter((set) => set.completedAt)).toHaveLength(1);
  });

  it('sends no block when there is none', () => {
    const draft = buildWorkoutSessionDraft({ ...routine, warmUpItems: [] });
    expect(toCreateWorkoutSessionInput(draft).warmUpItems).toBeUndefined();
  });
});
