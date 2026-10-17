import type { TFunction } from 'i18next';
import { describe, expect, it } from 'vitest';

import type { WorkoutSessionDraft } from '@/features/workouts/state/workoutDraftStore';

import { discardMessage } from './discardMessage';

const t = ((key: string, options?: { count?: number }) =>
  options?.count === undefined ? key : `${key}:${options.count}`) as unknown as TFunction;

const draft = (done: boolean[]) =>
  ({
    exercises: [{ entries: done.map((value) => ({ done: value })) }],
  }) as unknown as WorkoutSessionDraft;

describe('discardMessage', () => {
  it('names the sets done that would be lost (AC-15)', () => {
    expect(discardMessage(draft([true, true, true, false]), t)).toBe('workouts.discardLost:3');
  });

  it('says when no set is done yet', () => {
    expect(discardMessage(draft([false]), t)).toBe('workouts.discardNoneDone');
  });
});
