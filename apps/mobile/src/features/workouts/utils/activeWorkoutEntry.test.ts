import { describe, expect, it } from 'vitest';

import type { WorkoutSessionDraft } from '@/features/workouts/state/workoutDraftStore';

import { resolveActiveWorkoutEntry } from './activeWorkoutEntry';

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
