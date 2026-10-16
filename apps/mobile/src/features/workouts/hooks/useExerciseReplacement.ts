import { useState, type ComponentProps } from 'react';
import { useTranslation } from 'react-i18next';

import type { Exercise } from '@workout/domain';

import type { ExercisePickerModal } from '@/features/exercises/components/ExercisePickerModal';
import {
  getActiveWorkout,
  setActiveWorkout,
  type WorkoutSessionDraft,
} from '@/features/workouts/state/workoutDraftStore';
import {
  countDoneSets,
  replaceExerciseInWorkout,
  type DoneSetsChoice,
} from '@/features/workouts/utils/replaceExercise';

type PickerProps = ComponentProps<typeof ExercisePickerModal>;

/**
 * Replacing an exercise of the active workout (spec 0020 FR-3, EF-1). `start`
 * opens the picker for one exercise; while it is open `pickerProps` replaces
 * the screen's "add exercise" props. With done sets, the picker asks whether
 * to keep them as their own exercise (the default) or drop them.
 */
export function useExerciseReplacement(workoutDraft: WorkoutSessionDraft | null) {
  const { t } = useTranslation();
  const [targetId, setTargetId] = useState<string | null>(null);
  const target = targetId
    ? workoutDraft?.exercises.find((exercise) => exercise.id === targetId)
    : undefined;

  const replace = (exercise: Exercise, doneSets: DoneSetsChoice) => {
    const current = getActiveWorkout();

    if (current && targetId) {
      setActiveWorkout(
        replaceExerciseInWorkout(current, targetId, exercise, doneSets),
      );
    }
  };

  const pickerProps: PickerProps | null = target
    ? {
        visible: true,
        title: t('workouts.replaceTitle', { name: target.exerciseName }),
        onClose: () => setTargetId(null),
        onSelect: (exercise) => replace(exercise, 'drop'),
        confirm: (exercise) => {
          const done = countDoneSets(target);

          if (done === 0) {
            return null;
          }

          return {
            title: t('workouts.replaceDoneTitle', {
              current: target.exerciseName,
              next: exercise.name,
            }),
            message: t('workouts.replaceDoneMessage', {
              current: target.exerciseName,
              count: done,
            }),
            actions: [
              {
                label: t('workouts.replaceKeepDone', { count: done }),
                onPress: () => replace(exercise, 'keep'),
              },
              {
                label: t('workouts.replaceDropDone', { count: done }),
                destructive: true,
                onPress: () => replace(exercise, 'drop'),
              },
            ],
          };
        },
      }
    : null;

  return { start: setTargetId, pickerProps };
}
