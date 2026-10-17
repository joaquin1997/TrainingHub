import type { StartingRecords } from '@workout/domain';
import { describe, expect, it } from 'vitest';

import {
  toggleWorkoutSetDone,
  type WorkoutSessionDraft,
  type WorkoutSetDraft,
} from '@/features/workouts/state/workoutDraftStore';

import { tickFeedback } from './tickFeedback';

const bench: StartingRecords = {
  exerciseId: 'bench',
  bests: {
    heaviestWeight: 100,
    mostReps: 12,
    bestSetVolume: 960,
    bestSessionVolume: 5000,
    bestEstimatedOneRepMax: 120,
  },
  repsAtWeight: [{ weightKg: 100, reps: 6 }],
};

const set = (id: string, weightKg: string, reps: string, done = false): WorkoutSetDraft => ({
  id,
  order: 1,
  weightKg,
  reps,
  done,
  type: 'normal',
});

function workout(sets: WorkoutSetDraft[], starting?: Record<string, StartingRecords>): WorkoutSessionDraft {
  return {
    id: 'w',
    clientId: 'c',
    routineId: 'r',
    routineName: 'Push',
    startedAt: '2026-10-18T09:00:00.000Z',
    unit: 'kg',
    startingRecords: starting,
    exercises: [
      { id: 'we-1', exerciseId: 'bench', exerciseName: 'Bench press', order: 1, entries: sets },
    ],
  };
}

describe('tickFeedback (spec 0034 FR-4, EF-3)', () => {
  it('is the set-done tap for an ordinary tick', () => {
    const before = workout([set('s1', '60', '3')], { bench });
    const after = toggleWorkoutSetDone(before, 'we-1', 's1');

    expect(tickFeedback(before, after, 's1')).toBe('setDone');
  });

  it('is the record pattern, instead of the tap, when the tick earns a badge', () => {
    const before = workout([set('s1', '110', '5')], { bench });
    const after = toggleWorkoutSetDone(before, 'we-1', 's1');

    expect(tickFeedback(before, after, 's1')).toBe('record');
  });

  it('gives nothing for an untick', () => {
    const before = workout([set('s1', '110', '5', true)], { bench });
    const after = toggleWorkoutSetDone(before, 'we-1', 's1');

    expect(tickFeedback(before, after, 's1')).toBeNull();
  });

  it('gives only the tap when starting records are not loaded', () => {
    const before = workout([set('s1', '110', '5')]);
    const after = toggleWorkoutSetDone(before, 'we-1', 's1');

    expect(tickFeedback(before, after, 's1')).toBe('setDone');
  });
});
