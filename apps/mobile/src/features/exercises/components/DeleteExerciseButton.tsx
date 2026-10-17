import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import { exercisesClient } from '@/features/exercises/api/exercisesClient';
import {
  describeDeletionImpact,
  isInActiveWorkout,
} from '@/features/exercises/utils/exerciseDeletion';
import { isExerciseGone } from '@/features/exercises/utils/exerciseAvailability';
import { getActiveWorkout } from '@/features/workouts/state/workoutDraftStore';
import { confirmAction } from '@/lib/confirmAction';
import { Button } from '@/ui/Button';
import { commonStyles, spacing } from '@/ui/theme';
import type { Exercise, ExerciseDeletionImpact } from '@workout/domain';

interface DeleteExerciseButtonProps {
  /** The creator's own custom exercise; the caller decides that. */
  exercise: Pick<Exercise, 'id' | 'name'>;
  /** Called once it is gone (deleted now, or already deleted elsewhere). */
  onDeleted: () => void;
}

/**
 * Deletes a custom exercise (spec 0033): checks the impact first, names it in
 * the confirmation, then deletes. Never deletes without the impact (EF-6),
 * never queues offline (EF-1); "not found" means it is already gone (EF-2).
 */
export function DeleteExerciseButton({ exercise, onDeleted }: DeleteExerciseButtonProps) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  async function handleDelete() {
    setError(undefined);
    setBusy(true);
    try {
      let impact: ExerciseDeletionImpact;
      try {
        impact = await exercisesClient.getDeletionImpact(exercise.id);
      } catch (impactError) {
        if (isExerciseGone(impactError)) {
          onDeleted();
          return;
        }
        setError(t('exerciseDeletion.impactError'));
        return;
      }

      const inActiveWorkout = isInActiveWorkout(getActiveWorkout(), exercise.id);
      const message = describeDeletionImpact(impact, inActiveWorkout)
        .map((line) => t(line.key, { count: line.count }))
        .join('\n');

      const confirmed = await confirmAction({
        title: t('exerciseDeletion.confirmTitle', { name: exercise.name }),
        message,
        confirmLabel: t('exerciseDeletion.confirm'),
        cancelLabel: t('common.cancel'),
        destructive: true,
      });
      if (!confirmed) {
        return;
      }

      try {
        await exercisesClient.remove(exercise.id, { inActiveWorkout });
      } catch (deleteError) {
        if (!isExerciseGone(deleteError)) {
          setError(t('exerciseDeletion.deleteError'));
          return;
        }
      }
      onDeleted();
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.container}>
      <Button
        label={t('exerciseDeletion.action')}
        icon="trash-outline"
        variant="ghost"
        destructive
        disabled={busy}
        onPress={() => void handleDelete()}
        fullWidth
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
  },
  error: {
    ...commonStyles.meta,
    textAlign: 'center',
  },
});
