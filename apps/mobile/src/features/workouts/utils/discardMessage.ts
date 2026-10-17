import type { TFunction } from 'i18next';

import {
  countWorkoutSets,
  type WorkoutSessionDraft,
} from '@/features/workouts/state/workoutDraftStore';

/**
 * The discard confirmation's message, naming the sets done that would be lost
 * (spec 0035 FR-20, FR-22): "3 sets done will be lost" or "No sets done yet".
 */
export function discardMessage(draft: WorkoutSessionDraft, t: TFunction): string {
  const { done } = countWorkoutSets(draft);
  return done > 0 ? t('workouts.discardLost', { count: done }) : t('workouts.discardNoneDone');
}
