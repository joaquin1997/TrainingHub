import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import type { TFunction } from 'i18next';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { routinesClient } from '@/features/routines/api/routinesClient';
import { exerciseBlockLabels } from '@/features/routines/utils/exerciseBlockLabels';
import { SupersetHeader } from '@/features/routines/components/SupersetHeader';
import { buildRoutineCopyInput } from '@/features/routines/utils/duplicateRoutine';
import { routineSetLabel } from '@/features/routines/utils/routineApproachSets';
import { useSettings } from '@/features/settings/SettingsContext';
import { useActiveWorkout } from '@/features/workouts/hooks/useActiveWorkout';
import { WarmUpChecklist } from '@/features/workouts/components/WarmUpChecklist';
import { useRoutineStart } from '@/features/workouts/hooks/useRoutineStart';
import { confirmAction } from '@/lib/confirmAction';
import { formatDuration } from '@/lib/format';
import { formatDistance, tracksField } from '@/lib/tracking';
import { formatWeightValue } from '@/lib/weight';
import { ActionSheet } from '@/ui/ActionSheet';
import { Button } from '@/ui/Button';
import { Chip } from '@/ui/Chip';
import { StateView } from '@/ui/StateView';
import { colors, commonStyles, fonts, radii, spacing } from '@/ui/theme';
import type { RoutineExerciseSet, Routine } from '@workout/domain';

function formatReps(set: RoutineExerciseSet, t: TFunction) {
  if (set.minReps !== undefined && set.maxReps !== undefined) {
    return set.minReps === set.maxReps
      ? t('routineDetail.repsExact', { reps: set.minReps })
      : t('routineDetail.repsRange', { min: set.minReps, max: set.maxReps });
  }
  if (set.minReps !== undefined) {
    return t('routineDetail.repsMin', { min: set.minReps });
  }
  if (set.maxReps !== undefined) {
    return t('routineDetail.repsUpTo', { max: set.maxReps });
  }
  return t('routineDetail.repsNone');
}

/** A time and/or distance target, e.g. "500 m · 1:45" (spec 0021). */
function formatTimedTarget(set: RoutineExerciseSet) {
  const parts = [
    set.targetDistanceMeters !== undefined ? formatDistance(set.targetDistanceMeters) : null,
    set.targetDurationSeconds !== undefined ? formatDuration(set.targetDurationSeconds) : null,
  ].filter((part): part is string => part !== null);
  return parts.length > 0 ? parts.join(' · ') : '–';
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
  // Starting while another workout is in progress asks first (spec 0019).
  const { startRoutine, sheet: switchSheet } = useRoutineStart();
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

  async function confirmDelete(name: string) {
    const confirmed = await confirmAction({
      title: t('routines.deleteTitle'),
      message: t('routines.deleteConfirm', { name }),
      confirmLabel: t('common.delete'),
      cancelLabel: t('common.cancel'),
      destructive: true,
    });
    if (confirmed) {
      await handleDelete();
    }
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
      <View style={styles.screen}>
        <StateView kind="loading" message={t('routineDetail.loading')} />
      </View>
    );
  }

  if (!routine) {
    return (
      <View style={styles.screen}>
        <StateView
          kind="error"
          title={t('routineDetail.unavailable')}
          message={errorMessage ?? t('routineDetail.notFoundResponse')}
          actionLabel={t('common.retry')}
          onAction={() => void loadRoutine()}
        />
        <Button
          label={t('routineDetail.backToRoutines')}
          variant="ghost"
          onPress={() => router.replace('/routines')}
          style={styles.centered}
        />
      </View>
    );
  }

  const isLocked = activeWorkout?.routineId === routine.id;
  const exercises = routine.exercises
    .slice()
    .sort((left, right) => left.orderIndex - right.orderIndex);
  const blockLabels = exerciseBlockLabels(exercises);
  const blocks: Array<{ key: string; members: number[] }> = [];
  blockLabels.forEach((label, index) => {
    if (label.superset === 'none' || label.superset === 'start') {
      blocks.push({ key: exercises[index]?.id ?? String(index), members: [index] });
    } else {
      blocks[blocks.length - 1]?.members.push(index);
    }
  });

  const renderExercise = (index: number, inSuperset: boolean) => {
    const exercise = exercises[index];
    const label = blockLabels[index];
    if (!exercise || !label) {
      return null;
    }
    const sets = exercise.sets
      .slice()
      .sort((left, right) => left.setNumber - right.setNumber);

    return (
      <View key={exercise.id} style={styles.exercise}>
        <View style={styles.exerciseHeader}>
          <View style={[styles.blockBadge, inSuperset ? styles.blockBadgeSuperset : null]}>
            <Text style={[styles.blockBadgeText, inSuperset ? styles.blockBadgeTextSuperset : null]}>
              {label.label}
            </Text>
          </View>
          <Text style={styles.exerciseTitle}>{exercise.exerciseName}</Text>
          {/* Spec 0033 FR-7: kept in the routine, but no longer in the catalog. */}
          {exercise.exerciseDeleted ? (
            <Chip icon="trash-outline" label={t('exerciseDeletion.deleted')} size="sm" />
          ) : null}
          {exercise.restSeconds !== undefined ? (
            <Chip
              icon="timer-outline"
              label={formatDuration(exercise.restSeconds)}
              size="sm"
            />
          ) : null}
        </View>
        {sets.length === 0 ? (
          <Text style={[styles.meta, inSuperset ? styles.setTableIndented : null]}>
            {t('routineDetail.noTargetSets')}
          </Text>
        ) : (
          <View style={[styles.setTable, inSuperset ? styles.setTableIndented : null]}>
            <View style={styles.setHeaderRow}>
              <Text style={styles.columnLabel}>{t('workouts.colSet')}</Text>
              <Text style={[styles.columnLabel, styles.columnRight]}>
                {t('routineDetail.colTarget')}
              </Text>
            </View>
            {sets.map((set, setIndex) => (
              <View key={set.id} style={styles.setRow}>
                <Text style={styles.setNumber}>
                  {routineSetLabel(sets, setIndex, t('workouts.setType.warmup'))}
                </Text>
                <Text style={styles.setTarget}>
                  {set.targetWeight !== undefined && tracksField(exercise.trackingType, 'weight') ? (
                    <>
                      <Text style={styles.setFigure}>
                        {formatWeightValue(set.targetWeight, settings.unit)}
                      </Text>
                      <Text style={styles.setUnit}>{` ${settings.unit}  ·  `}</Text>
                    </>
                  ) : null}
                  <Text style={styles.setFigure}>
                    {tracksField(exercise.trackingType, 'reps')
                      ? formatReps(set, t)
                      : formatTimedTarget(set)}
                  </Text>
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  return (
    <>
    <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
      <View style={styles.header}>
        {routine.folder ? <Chip icon="folder-outline" label={routine.folder} size="sm" /> : null}
        <Text style={styles.title}>{routine.name}</Text>
        {routine.description ? (
          <Text style={styles.description}>{routine.description}</Text>
        ) : null}
        <View style={styles.metaRow}>
          <Ionicons name="barbell-outline" size={14} color={colors.textMuted} />
          <Text style={styles.meta}>
            {t('routines.exerciseCount', { count: exercises.length })}
          </Text>
        </View>
      </View>
      {isLocked ? (
        <View style={styles.lockNotice}>
          <Ionicons name="lock-closed" size={18} color={colors.primary} />
          <View style={styles.lockText}>
            <Text style={styles.lockTitle}>{t('routines.activeLabel')}</Text>
            <Text style={styles.meta}>{t('routineDetail.editLocked')}</Text>
          </View>
        </View>
      ) : null}
      {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
      <WarmUpChecklist
        items={(routine.warmUpItems ?? []).map((item) => ({ ...item, key: String(item.order) }))}
      />
      {exercises.length === 0 ? (
        <StateView kind="empty" icon="barbell-outline" message={t('routineDetail.noExercises')} />
      ) : (
        <View style={styles.blockList}>
          {blocks.map((block) => {
            const first = blockLabels[block.members[0] ?? 0];
            if (block.members.length === 1 || !first?.supersetIndex) {
              return (
                <View key={block.key} style={styles.blockCard}>
                  {block.members.map((index) => renderExercise(index, false))}
                </View>
              );
            }
            return (
              <View key={block.key} style={styles.blockCard}>
                <SupersetHeader size={block.members.length} />
                <View style={styles.supersetBody}>
                  <View style={styles.rail} />
                  <View style={styles.supersetMembers}>
                    {block.members.map((index) => renderExercise(index, true))}
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      )}
      <View style={styles.actions}>
        <Button
          label={isLocked ? t('routines.continueWorkout') : t('routines.startWorkout')}
          icon="play"
          fullWidth
          onPress={() => startRoutine(routine)}
        />
        <View style={styles.actionRow}>
          {/* Editing and deleting are locked while this routine's workout is in progress (spec 0014). */}
          <Button
            label={t('common.edit')}
            icon={isLocked ? 'lock-closed' : 'create-outline'}
            variant="secondary"
            disabled={isLocked}
            onPress={() => router.push(`/routines/edit/${routine.id}`)}
            style={styles.actionHalf}
          />
          <Button
            label={isDuplicating ? t('routineDetail.duplicating') : t('routines.duplicate')}
            icon="copy-outline"
            variant="secondary"
            disabled={isDuplicating}
            onPress={() => void handleDuplicate()}
            style={styles.actionHalf}
          />
        </View>
        <Button
          label={isDeleting ? t('routineDetail.deleting') : t('routines.deleteTitle')}
          icon="trash-outline"
          variant="ghost"
          destructive
          disabled={isDeleting || isLocked}
          onPress={() => void confirmDelete(routine.name)}
          style={styles.centered}
        />
      </View>
    </ScrollView>
    <ActionSheet {...switchSheet} />
    </>
  );
}

const styles = StyleSheet.create({
  screen: {
    ...commonStyles.screen,
  },
  container: {
    ...commonStyles.scrollContent,
  },
  centered: {
    alignSelf: 'center',
  },
  header: {
    gap: spacing.sm,
  },
  title: {
    ...commonStyles.heading,
    fontSize: 28,
    lineHeight: 34,
  },
  description: {
    ...commonStyles.body,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  meta: {
    ...commonStyles.meta,
  },
  error: {
    ...commonStyles.error,
  },
  lockNotice: {
    ...commonStyles.card,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  lockText: {
    flex: 1,
    gap: 2,
  },
  lockTitle: {
    color: colors.primary,
    fontFamily: fonts.displayBold,
    fontSize: 15,
  },
  blockList: {
    gap: spacing.md,
  },
  blockCard: {
    ...commonStyles.card,
    gap: spacing.md,
  },
  supersetBody: {
    position: 'relative',
  },
  rail: {
    position: 'absolute',
    left: 13,
    top: 14,
    bottom: 14,
    width: 2,
    borderRadius: 1,
    backgroundColor: colors.borderStrong,
  },
  supersetMembers: {
    gap: spacing.lg,
  },
  exercise: {
    gap: spacing.sm,
  },
  exerciseHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  blockBadge: {
    minWidth: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceRaised,
    paddingHorizontal: 4,
  },
  blockBadgeSuperset: {
    borderRadius: 14,
    backgroundColor: colors.background,
    borderWidth: 1.5,
    borderColor: colors.textMuted,
  },
  blockBadgeText: {
    color: colors.text,
    fontFamily: fonts.displayBold,
    fontSize: 13,
  },
  blockBadgeTextSuperset: {
    color: colors.text,
    fontSize: 12,
  },
  exerciseTitle: {
    ...commonStyles.cardTitle,
    flex: 1,
    paddingTop: 2,
  },
  setTable: {
    gap: spacing.xs,
  },
  setTableIndented: {
    marginLeft: 36,
  },
  setHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
  },
  columnLabel: {
    ...commonStyles.sectionLabel,
    fontSize: 11,
  },
  columnRight: {
    textAlign: 'right',
  },
  setRow: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: radii.md,
    backgroundColor: colors.surfaceRaised,
    paddingHorizontal: spacing.md,
  },
  setNumber: {
    color: colors.textMuted,
    fontFamily: fonts.displayBold,
    fontSize: 15,
    fontVariant: ['tabular-nums'],
  },
  setTarget: {
    textAlign: 'right',
  },
  setFigure: {
    color: colors.text,
    fontFamily: fonts.displayBold,
    fontSize: 18,
    fontVariant: ['tabular-nums'],
  },
  setUnit: {
    color: colors.textMuted,
    fontFamily: fonts.display,
    fontSize: 13,
  },
  actions: {
    gap: spacing.md,
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  actionHalf: {
    flex: 1,
  },
});
