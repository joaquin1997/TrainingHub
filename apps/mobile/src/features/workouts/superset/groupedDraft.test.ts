import { describe, expect, it } from 'vitest';

import type {
  WorkoutExerciseDraft,
  WorkoutSessionDraft,
} from '@/features/workouts/state/workoutDraftStore';

import { moveWorkoutExerciseInGroups, removeWorkoutExerciseInGroups } from './groupedDraft';
import { completeSetInRounds } from './rounds';

const exercise = (id: string, supersetGroup?: number, restSeconds?: number): WorkoutExerciseDraft => ({
  id,
  exerciseId: `ex-${id}`,
  exerciseName: id,
  supersetGroup,
  restSeconds,
  order: 0,
  entries: [1, 2].map((n) => ({
    id: `${id}${n}`,
    order: n,
    reps: '',
    weightKg: '',
    done: false,
    type: 'normal' as const,
  })),
});

const workout = (...exercises: WorkoutExerciseDraft[]): WorkoutSessionDraft => ({
  id: 'w',
  clientId: 'c',
  routineId: 'r',
  routineName: 'R',
  startedAt: '2026-10-17T09:00:00.000Z',
  exercises: exercises.map((item, index) => ({ ...item, order: index + 1 })),
});

const shape = (draft: WorkoutSessionDraft) =>
  draft.exercises.map((item) => `${item.id}${item.supersetGroup ?? ''}:${item.order}`);

describe('moveWorkoutExerciseInGroups (spec 0029)', () => {
  it('splits a pair when its first exercise moves up; each then rests alone (AC-9)', () => {
    const moved = moveWorkoutExerciseInGroups(workout(exercise('A', 1, 30), exercise('B', 1, 40)), 'A', 'up');
    expect(shape(moved)).toEqual(['A:1', 'B:2']);

    const ticked = completeSetInRounds(moved, 'A', 'A1', 90, new Date('2026-10-17T10:00:00Z'));
    expect(ticked.rest?.totalSeconds).toBe(30);
  });

  it('moves an exercise alone past the whole superset (AC-10)', () => {
    const moved = moveWorkoutExerciseInGroups(
      workout(exercise('A', 1), exercise('B', 1), exercise('X')),
      'X',
      'up',
    );
    expect(shape(moved)).toEqual(['X:1', 'A1:2', 'B1:3']);
  });

  it('leaves the workout as it is for an unknown exercise', () => {
    const draft = workout(exercise('A'));
    expect(moveWorkoutExerciseInGroups(draft, 'gone', 'up')).toBe(draft);
  });
});

describe('removeWorkoutExerciseInGroups (FR-21)', () => {
  it('keeps the superset for the others and renumbers', () => {
    const removed = removeWorkoutExerciseInGroups(
      workout(exercise('A', 1), exercise('B', 1), exercise('C', 1)),
      'B',
    );
    expect(shape(removed)).toEqual(['A1:1', 'C1:2']);
  });
});
