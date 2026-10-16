import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import type { TFunction } from 'i18next';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { routinesClient } from '@/features/routines/api/routinesClient';
import { getRoutineExerciseSummary } from '@/features/routines/utils/routineSummary';
import { buildRoutineCopyInput } from '@/features/routines/utils/duplicateRoutine';
import { useSettings } from '@/features/settings/SettingsContext';
import { useActiveWorkout } from '@/features/workouts/hooks/useActiveWorkout';
import { formatWeight } from '@/lib/weight';
import { colors, commonStyles, radii, spacing } from '@/ui/theme';
import type { RoutineExerciseSet, Routine, WeightUnit } from '@workout/domain';

function formatSetTarget(set: RoutineExerciseSet, unit: WeightUnit, t: TFunction) {
  const reps =
    set.minReps !== undefined && set.maxReps !== undefined
      ? t('routineDetail.repsRange', { min: set.minReps, max: set.maxReps })
      : set.minReps !== undefined
        ? t('routineDetail.repsMin', { min: set.minReps })
        : set.maxReps !== undefined
          ? t('routineDetail.repsUpTo', { max: set.maxReps })
          : t('routineDetail.repsNone');
  const weight =
    set.targetWeight !== undefined
      ? ` - ${formatWeight(set.targetWeight, unit)}`
      : '';

  return `${reps}${weight}`;
}

export function RoutineDetailScreen() {
  const { t } = useTranslation();
  const { routineId } = useLocalSearchParams<{ routineId?: string }>();
  const router = useRouter();
  const [routine, setRoutine] = useState<Routine | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string>();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDuplicating, setIsDuplicating] = useState(false);
  const activeWorkout = useActiveWorkout();
  const { settings } = useSettings();

  const loadRoutine = useCallback(
    async (shouldUpdate: () => boolean = () => true) => {
      if (shouldUpdate()) {
        setIsLoading(true);
        setErrorMessage(undefined);
        setRoutine(null);
      }

      if (!routineId) {
        if (shouldUpdate()) {
          setErrorMessage(t('routineDetail.missingId'));
          setIsLoading(false);
        }
        return;
      }

      try {
        const nextRoutine = await routinesClient.getById(routineId);

        if (shouldUpdate()) {
          if (!nextRoutine) {
            setErrorMessage(t('routineDetail.notFound'));
            return;
          }

          setRoutine(nextRoutine);
        }
      } catch (error) {
        if (shouldUpdate()) {
          setErrorMessage(
            error instanceof Error ? error.message : t('routineDetail.loadError'),
          );
        }
      } finally {
        if (shouldUpdate()) {
          setIsLoading(false);
        }
      }
    },
    [routineId, t],
  );

  useEffect(() => {
    let isActive = true;

    void loadRoutine(() => isActive);

    return () => {
      isActive = false;
    };
  }, [loadRoutine]);

  function confirmDelete(name: string) {
    Alert.alert(
      t('routines.deleteTitle'),
      t('routines.deleteConfirm', { name }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: () => void handleDelete(),
        },
      ],
    );
  }

  async function handleDelete() {
    if (!routineId) {
      return;
    }

    try {
      setIsDeleting(true);
      setErrorMessage(undefined);
      await routinesClient.remove(routineId);
      router.replace('/routines');
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : t('routines.deleteError'),
      );
    } finally {
      setIsDeleting(false);
    }
  }

  async function handleDuplicate() {
    if (!routine) {
      return;
    }

    try {
      setIsDuplicating(true);
      setErrorMessage(undefined);

      const created = await routinesClient.create(buildRoutineCopyInput(routine));

      router.replace(`/routines/${created.id}`);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : t('routines.duplicateError'),
      );
    } finally {
      setIsDuplicating(false);
    }
  }

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Text style={styles.body}>{t('routineDetail.loading')}</Text>
      </View>
    );
  }

  if (!routine) {
    return (
      <View style={styles.container}>
        <Text style={styles.body}>{t('routineDetail.unavailable')}</Text>
        <Text style={styles.error}>
          {errorMessage ?? t('routineDetail.notFoundResponse')}
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => void loadRoutine()}
          style={({ pressed }) => [
            styles.secondaryButton,
            pressed ? styles.buttonPressed : null,
          ]}
        >
          <Text style={styles.secondaryButtonText}>{t('common.retry')}</Text>
        </Pressable>
        <Link href="/routines" style={styles.link}>
          {t('routineDetail.backToRoutines')}
        </Link>
      </View>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
      <Text style={styles.body}>{routine.name}</Text>
      {routine.description ? (
        <Text style={styles.description}>{routine.description}</Text>
      ) : null}
      {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
      <Text style={styles.meta}>
        {t('routineDetail.exerciseSummary', {
          summary: getRoutineExerciseSummary(routine, 3),
        })}
      </Text>
      {routine.exercises.length === 0 ? (
        <Text style={styles.meta}>{t('routineDetail.noExercises')}</Text>
      ) : (
        <View style={styles.exerciseList}>
          {routine.exercises
            .slice()
            .sort((left, right) => left.orderIndex - right.orderIndex)
            .map((exercise) => (
              <View key={exercise.id} style={styles.exerciseCard}>
                <Text style={styles.exerciseTitle}>
                  {exercise.orderIndex}. {exercise.exerciseName}
                </Text>
                {exercise.restSeconds !== undefined ? (
                  <Text style={styles.meta}>
                    {t('routineDetail.rest', { seconds: exercise.restSeconds })}
                  </Text>
                ) : null}
                {exercise.supersetGroup !== undefined ? (
                  <Text style={styles.supersetBadge}>
                    {t('routineDetail.superset', { group: exercise.supersetGroup })}
                  </Text>
                ) : null}
                {exercise.sets.length === 0 ? (
                  <Text style={styles.meta}>{t('routineDetail.noTargetSets')}</Text>
                ) : (
                  exercise.sets
                    .slice()
                    .sort((left, right) => left.setNumber - right.setNumber)
                    .map((set) => (
                      <Text key={set.id} style={styles.exerciseItem}>
                        {t('routineDetail.setLine', {
                          number: set.setNumber,
                          target: formatSetTarget(set, settings.unit, t),
                        })}
                      </Text>
                    ))
                )}
              </View>
            ))}
        </View>
      )}
      <View style={styles.actions}>
        <Pressable
          onPress={() =>
            router.push({
              pathname: '/workouts/active',
              params: {
                routineId:
                  activeWorkout && activeWorkout.routineId !== routine.id
                    ? activeWorkout.routineId
                    : routine.id,
              },
            })
          }
          style={({ pressed }) => [
            styles.primaryButton,
            pressed ? styles.buttonPressed : null,
          ]}
        >
          <Text style={styles.primaryButtonText}>
            {activeWorkout && activeWorkout.routineId === routine.id
              ? t('routines.continueWorkout')
              : activeWorkout
                ? t('routines.resumeWorkout')
                : t('routines.startWorkout')}
          </Text>
        </Pressable>
        {activeWorkout && activeWorkout.routineId === routine.id ? (
          <Text style={styles.meta}>{t('routineDetail.editLocked')}</Text>
        ) : (
          <View style={styles.actionRow}>
            <Pressable
              onPress={() => router.push(`/routines/edit/${routine.id}`)}
              style={({ pressed }) => [
                styles.secondaryButton,
                pressed ? styles.buttonPressed : null,
              ]}
            >
              <Text style={styles.secondaryButtonText}>{t('common.edit')}</Text>
            </Pressable>
            <Pressable
              onPress={() => void handleDuplicate()}
              disabled={isDuplicating}
              style={({ pressed }) => [
                styles.secondaryButton,
                pressed ? styles.buttonPressed : null,
              ]}
            >
              <Text style={styles.secondaryButtonText}>
                {isDuplicating
                  ? t('routineDetail.duplicating')
                  : t('routines.duplicate')}
              </Text>
            </Pressable>
          </View>
        )}
      </View>
      {/* Locked with editing while this routine's workout is in progress (spec 0014). */}
      {activeWorkout?.routineId === routine.id ? null : (
        <Pressable
          accessibilityRole="button"
          onPress={() => confirmDelete(routine.name)}
          disabled={isDeleting}
          style={({ pressed }) => [
            styles.deleteButton,
            pressed ? styles.buttonPressed : null,
            isDeleting ? styles.buttonDisabled : null,
          ]}
        >
          <Text style={styles.deleteButtonText}>
            {isDeleting ? t('routineDetail.deleting') : t('routines.deleteTitle')}
          </Text>
        </Pressable>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    ...commonStyles.screen,
  },
  container: {
    ...commonStyles.scrollContent,
  },
  title: {
    ...commonStyles.title,
  },
  body: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '800',
  },
  description: {
    ...commonStyles.body,
  },
  meta: {
    ...commonStyles.meta,
  },
  error: {
    ...commonStyles.error,
  },
  exerciseList: {
    gap: spacing.md,
  },
  exerciseCard: {
    ...commonStyles.card,
    gap: spacing.sm,
  },
  exerciseTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  exerciseItem: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  supersetBadge: {
    alignSelf: 'flex-start',
    color: colors.accent,
    backgroundColor: colors.accentSoft,
    fontSize: 12,
    fontWeight: '800',
    borderRadius: radii.sm,
    paddingHorizontal: 8,
    paddingVertical: 2,
    overflow: 'hidden',
  },
  link: {
    ...commonStyles.link,
  },
  actions: {
    gap: spacing.md,
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  primaryButton: {
    ...commonStyles.primaryButton,
    alignSelf: 'stretch',
  },
  primaryButtonText: {
    ...commonStyles.primaryButtonText,
  },
  deleteButton: {
    ...commonStyles.secondaryButton,
    alignSelf: 'stretch',
    borderColor: colors.danger,
    backgroundColor: colors.dangerSoft,
  },
  secondaryButton: {
    ...commonStyles.secondaryButton,
    flex: 1,
  },
  secondaryButtonText: {
    ...commonStyles.secondaryButtonText,
  },
  deleteButtonText: {
    color: colors.danger,
    fontSize: 15,
    fontWeight: '800',
  },
  buttonDisabled: {
    ...commonStyles.disabled,
  },
  buttonPressed: {
    ...commonStyles.pressed,
  },
});
