import { describe, expect, it } from 'vitest';

import type { WorkoutSessionDraft } from '@/features/workouts/state/workoutDraftStore';

import {
  resolveActiveWorkoutEntry,
  resolveRoutineStart,
  resolveSwitchOutcome,
} from './activeWorkoutEntry';

const draft = { routineId: 'r1' } as WorkoutSessionDraft;

describe('resolveActiveWorkoutEntry', () => {
  it('resumes an active workout without a routine in the link', () => {
    expect(resolveActiveWorkoutEntry(draft, undefined)).toBe('resume');
  });

  it('resumes the active workout even when the link names another routine', () => {
    expect(resolveActiveWorkoutEntry(draft, 'r2')).toBe('resume');
  });

  it('fetches the routine when nothing is active', () => {
    expect(resolveActiveWorkoutEntry(null, 'r1')).toBe('fetch');
  });

  it('has nothing to open without a workout or a routine', () => {
    expect(resolveActiveWorkoutEntry(null, undefined)).toBe('none');
  });
});

describe('resolveRoutineStart', () => {
  it('starts the routine when nothing is active', () => {
    expect(resolveRoutineStart(null, 'r1')).toBe('start');
  });

  it('opens the active workout for its own routine without asking', () => {
    expect(resolveRoutineStart(draft, 'r1')).toBe('open');
  });

  it('asks when another workout is active', () => {
    expect(resolveRoutineStart(draft, 'r2')).toBe('ask');
  });
});

describe('resolveSwitchOutcome', () => {
  const withSets = (...done: boolean[]) =>
    ({
      routineId: 'r1',
      exercises: [
        {
          entries: done.map((isDone, index) => ({ id: `s${index}`, done: isDone })),
        },
      ],
    }) as unknown as WorkoutSessionDraft;

  it('discards a workout with no set done', () => {
    expect(resolveSwitchOutcome(withSets(false, false))).toBe('discard');
    expect(resolveSwitchOutcome({ ...draft, exercises: [] })).toBe('discard');
  });

  it('saves a workout with at least one set done', () => {
    expect(resolveSwitchOutcome(withSets(true, false, false))).toBe('save');
  });
});
