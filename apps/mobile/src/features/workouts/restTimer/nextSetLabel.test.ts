import type { TFunction } from 'i18next';
import { describe, expect, it } from 'vitest';

import type {
  WorkoutExerciseDraft,
  WorkoutSessionDraft,
} from '@/features/workouts/state/workoutDraftStore';

import { nextSetLabel } from './nextSetLabel';

const t = ((key: string, values?: Record<string, unknown>) =>
  `${key} ${JSON.stringify(values ?? {})}`) as unknown as TFunction;

const exercise = (
  id: string,
  sets: Array<{ done: boolean; warmup?: boolean }>,
  supersetGroup?: number,
): WorkoutExerciseDraft => ({
  id,
  exerciseId: `ex-${id}`,
  exerciseName: `Exercise ${id}`,
  supersetGroup,
  order: 0,
  entries: sets.map((set, i) => ({
    id: `${id}${i + 1}`,
    order: i + 1,
    reps: '',
    weightKg: '',
    done: set.done,
    type: set.warmup ? 'warmup' : 'normal',
  })),
});

const workout = (
  extra: Partial<WorkoutSessionDraft>,
  ...exercises: WorkoutExerciseDraft[]
): WorkoutSessionDraft => ({
  id: 'w',
  clientId: 'c',
  routineId: 'r',
  routineName: 'R',
  startedAt: '2026-10-17T09:00:00.000Z',
  exercises,
  ...extra,
});

describe('nextSetLabel (spec 0029 FR-10)', () => {
  it('names the exercise and set number of the set to do now (AC-1)', () => {
    const draft = workout(
      { lastTickedExerciseId: 'B' },
      exercise('A', [{ done: true }, { done: false }], 1),
      exercise('B', [{ done: true }, { done: false }], 1),
    );
    expect(nextSetLabel(draft, t)).toBe('workouts.nextSet {"exercise":"Exercise A","number":2}');
  });

  it('says warm-up for a warm-up set', () => {
    const draft = workout({}, exercise('A', [{ done: false, warmup: true }, { done: false }]));
    expect(nextSetLabel(draft, t)).toBe('workouts.nextWarmUp {"exercise":"Exercise A"}');
  });

  it('counts working sets only, after the warm-ups (spec 0040 FR-1)', () => {
    const draft = workout(
      {},
      exercise('A', [{ done: true, warmup: true }, { done: true, warmup: true }, { done: false }]),
    );
    expect(nextSetLabel(draft, t)).toBe('workouts.nextSet {"exercise":"Exercise A","number":1}');
  });

  it('is null when every set is done', () => {
    expect(nextSetLabel(workout({}, exercise('A', [{ done: true }])), t)).toBeNull();
  });
});
