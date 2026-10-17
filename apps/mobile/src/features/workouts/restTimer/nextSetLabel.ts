import type { TFunction } from 'i18next';

import type { WorkoutSessionDraft } from '@/features/workouts/state/workoutDraftStore';

import { currentSetToDo } from './nextSetToDo';

/**
 * The set to do now as words, e.g. "Barbell row · set 2" — for the rest bar
 * and the rest-over alert (spec 0029 FR-10). The number is the set's position
 * in its exercise, as its row shows it; a warm-up says so. Null when every set is done.
 */
export function nextSetLabel(draft: WorkoutSessionDraft, t: TFunction): string | null {
  const target = currentSetToDo(draft);
  const exercise = target
    ? draft.exercises.find((item) => item.id === target.workoutExerciseId)
    : undefined;
  const set = exercise?.entries.find((item) => item.id === target?.workoutSetId);
  if (!exercise || !set) {
    return null;
  }
  return set.type === 'warmup'
    ? t('workouts.nextWarmUp', { exercise: exercise.exerciseName })
    : t('workouts.nextSet', { exercise: exercise.exerciseName, number: set.order });
}
