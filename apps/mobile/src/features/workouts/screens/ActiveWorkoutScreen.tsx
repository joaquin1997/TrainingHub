import { Link, router, useLocalSearchParams } from 'expo-router';
import type { TFunction } from 'i18next';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  Vibration,
  View,
} from 'react-native';

import { routinesClient } from '@/features/routines/api/routinesClient';
import { workoutsClient } from '@/features/workouts/api/workoutsClient';
import { ExercisePickerModal } from '@/features/exercises/components/ExercisePickerModal';
import { ProgressRing } from '@/features/workouts/components/ProgressRing';
import { WheelPicker } from '@/features/workouts/components/WheelPicker';
import { useAuth } from '@/features/auth/AuthContext';
import { useSettings } from '@/features/settings/SettingsContext';
import { useActiveWorkout } from '@/features/workouts/hooks/useActiveWorkout';
import { resolveActiveWorkoutEntry } from '@/features/workouts/utils/activeWorkoutEntry';
import { Button } from '@/ui/Button';
import { confirmAction } from '@/lib/confirmAction';
import { formatDuration } from '@/lib/format';
import { isPermanentRejection } from '@/lib/http';
import { fromKg, roundWeight } from '@/lib/weight';
import { useElapsedSeconds } from '@/lib/useElapsedSeconds';
import { useRestTimer } from '@/lib/useRestTimer';
import { colors, commonStyles, radii, spacing } from '@/ui/theme';

const REST_MINUTES = Array.from({ length: 11 }, (_, i) => i); // 0–10 min
const REST_SECONDS = Array.from({ length: 12 }, (_, i) => i * 5); // 0,5,…,55
const pad2 = (value: number) => String(value).padStart(2, '0');
import type {
  Exercise,
  ExerciseLastPerformance,
  WeightUnit,
  WorkoutSetType,
} from '@workout/domain';
import { syncWorkoutCompletionToAppleHealth } from '@/features/health/integrations/appleWorkoutIntegration';
import {
  addExerciseToWorkout,
  addSetToWorkoutExercise,
  applyLastPerformance,
  clearActiveWorkout,
  countWorkoutSets,
  cycleWorkoutSetType,
  getActiveWorkout,
  moveWorkoutExercise,
  pauseWorkout,
  removeExerciseFromWorkout,
  removeSetFromWorkoutExercise,
  resumeWorkout,
  saveCompletedWorkout,
  setActiveWorkout,
  startActiveWorkout,
  toCreateWorkoutSessionInput,
  toggleWorkoutSetDone,
  toWorkoutSessionSkeleton,
  updateWorkoutSetDraft,
  type WorkoutSessionDraft,
} from '@/features/workouts/state/workoutDraftStore';

/** Compact "previous performance" label for a set (weight×reps), or "–". */
function prevSetLabel(
  performance: ExerciseLastPerformance | null | undefined,
  order: number,
  unit: WeightUnit,
) {
  const last = performance?.sets.find((set) => set.order === order);

  if (!last || (last.weightKg == null && last.reps == null)) {
    return '–';
  }

  const weight =
    last.weightKg != null ? roundWeight(fromKg(last.weightKg, unit)) : '–';
  return `${weight}×${last.reps ?? '–'}`;
}

function setTypeLabel(type: WorkoutSetType, t: TFunction) {
  switch (type) {
    case 'warmup':
      return t('workouts.setType.warmup');
    case 'drop':
      return t('workouts.setType.drop');
    case 'failure':
      return t('workouts.setType.failure');
    default:
      return t('workouts.setType.normal');
  }
}

export function ActiveWorkoutScreen() {
  const { t } = useTranslation();
  const { routineId } = useLocalSearchParams<{ routineId?: string }>();
  const workoutDraft = useActiveWorkout();
  // An active workout already on the device opens immediately, offline too.
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>(() =>
    resolveActiveWorkoutEntry(getActiveWorkout(), routineId) === 'resume'
      ? 'ready'
      : 'loading',
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isFinishing, setIsFinishing] = useState(false);
  const [finishError, setFinishError] = useState<string | null>(null);
  // The server refused the workout itself; retrying cannot help (EF-5).
  const [finishRefused, setFinishRefused] = useState(false);
  const [isPickerVisible, setIsPickerVisible] = useState(false);
  const [lastByExercise, setLastByExercise] = useState<
    Record<string, ExerciseLastPerformance | null>
  >({});
  const { settings } = useSettings();
  const { user } = useAuth();
  const [restDuration, setRestDuration] = useState(settings.defaultRestSeconds);
  const restTimer = useRestTimer(() => Vibration.vibrate([0, 400, 200, 400]));

  useEffect(() => {
    const entry = resolveActiveWorkoutEntry(getActiveWorkout(), routineId);

    if (entry === 'resume') {
      setStatus('ready');
      return;
    }

    if (entry === 'none' || !routineId) {
      setStatus('error');
      setErrorMessage(null);
      return;
    }

    let active = true;
    setStatus('loading');

    routinesClient
      .getById(routineId)
      .then((routine) => {
        if (!active) {
          return;
        }

        startActiveWorkout(routine, settings.unit, user?.id);
        setStatus('ready');
      })
      .catch((error: unknown) => {
        if (!active) {
          return;
        }

        setErrorMessage(
          error instanceof Error ? error.message : t('workouts.loadRoutineError'),
        );
        setStatus('error');
      });

    return () => {
      active = false;
    };
  }, [routineId]);

  const elapsedSeconds = useElapsedSeconds(workoutDraft?.startedAt, {
    pausedAt: workoutDraft?.pausedAt,
    pausedSeconds: workoutDraft?.pausedSeconds,
  });

  const exerciseIdsKey = workoutDraft
    ? [...new Set(workoutDraft.exercises.map((exercise) => exercise.exerciseId))].join(
        ',',
      )
    : '';

  useEffect(() => {
    if (!exerciseIdsKey) {
      return;
    }

    const ids = exerciseIdsKey.split(',');
    let active = true;

    void Promise.all(
      ids.map(async (id) => {
        try {
          return [id, await workoutsClient.getLastPerformance(id)] as const;
        } catch {
          return [id, null] as const;
        }
      }),
    ).then((entries) => {
      if (!active) {
        return;
      }

      setLastByExercise(Object.fromEntries(entries));

      // Seed each set's ghosted placeholder from its last performance so an
      // unedited set still logs what you did last time.
      const current = getActiveWorkout();
      if (!current) {
        return;
      }

      let next = current;
      for (const [id, performance] of entries) {
        if (performance) {
          next = applyLastPerformance(next, id, performance);
        }
      }

      if (next !== current) {
        setActiveWorkout(next);
      }
    });

    return () => {
      active = false;
    };
  }, [exerciseIdsKey]);

  if (status === 'loading') {
    return (
      <View style={styles.container}>
        <ActivityIndicator color={colors.primary} />
        <Text style={styles.meta}>{t('workouts.loadingRoutine')}</Text>
      </View>
    );
  }

  if (status === 'error' || !workoutDraft) {
    return (
      <View style={styles.container}>
        <Text style={styles.meta}>
          {errorMessage ?? t('workouts.startFromRoutine')}
        </Text>
        <Link href="/routines" style={styles.link}>
          {t('routineDetail.backToRoutines')}
        </Link>
      </View>
    );
  }

  const finishWorkout = async () => {
    if (countWorkoutSets(workoutDraft).done === 0) {
      setFinishError(t('workouts.markOneSet'));
      return;
    }

    try {
      setIsFinishing(true);
      setFinishError(null);
      setFinishRefused(false);

      await workoutsClient.create(toCreateWorkoutSessionInput(workoutDraft));

      const workoutSession = toWorkoutSessionSkeleton(workoutDraft);

      saveCompletedWorkout(workoutDraft);
      clearActiveWorkout();

      void syncWorkoutCompletionToAppleHealth(workoutSession);
      // Replace, so Back from the summary does not land on a finished workout.
      router.replace('/workouts/summary');
    } catch (error) {
      setFinishError(
        error instanceof Error ? error.message : t('workouts.saveError'),
      );
      setFinishRefused(isPermanentRejection(error));
    } finally {
      setIsFinishing(false);
    }
  };

  const handleSetChange = (
    workoutExerciseId: string,
    workoutSetId: string,
    field: 'reps' | 'weightKg',
    value: string,
  ) => {
    if (!workoutDraft) {
      return;
    }

    const nextDraft = updateWorkoutSetDraft(
      workoutDraft,
      workoutExerciseId,
      workoutSetId,
      field,
      value,
    );

    setActiveWorkout(nextDraft);
  };

  const handleToggleDone = (workoutExerciseId: string, workoutSetId: string) => {
    if (!workoutDraft) {
      return;
    }

    const exercise = workoutDraft.exercises.find(
      (item) => item.id === workoutExerciseId,
    );
    const becomingDone = !exercise?.entries.find(
      (set) => set.id === workoutSetId,
    )?.done;

    // Prefer the routine's per-exercise rest, falling back to the picker value.
    const rest = exercise?.restSeconds ?? restDuration;

    const nextDraft = toggleWorkoutSetDone(
      workoutDraft,
      workoutExerciseId,
      workoutSetId,
      becomingDone ? rest : undefined,
    );

    setActiveWorkout(nextDraft);

    if (becomingDone) {
      restTimer.start(rest);
    }
  };

  const applyDraft = (nextDraft: WorkoutSessionDraft) => {
    setActiveWorkout(nextDraft);
  };

  const handleAddSet = (workoutExerciseId: string) => {
    if (!workoutDraft) {
      return;
    }

    applyDraft(addSetToWorkoutExercise(workoutDraft, workoutExerciseId));
  };

  const handleAddExercise = (exercise: Exercise) => {
    if (!workoutDraft) {
      return;
    }

    applyDraft(
      addExerciseToWorkout(workoutDraft, {
        id: exercise.id,
        name: exercise.name,
      }),
    );
  };

  const handleRemoveExercise = (workoutExerciseId: string) => {
    if (!workoutDraft) {
      return;
    }

    applyDraft(removeExerciseFromWorkout(workoutDraft, workoutExerciseId));
  };

  const handleMoveExercise = (
    workoutExerciseId: string,
    direction: 'up' | 'down',
  ) => {
    if (!workoutDraft) {
      return;
    }

    applyDraft(
      moveWorkoutExercise(workoutDraft, workoutExerciseId, direction),
    );
  };

  const handleCycleSetType = (
    workoutExerciseId: string,
    workoutSetId: string,
  ) => {
    if (!workoutDraft) {
      return;
    }

    applyDraft(
      cycleWorkoutSetType(workoutDraft, workoutExerciseId, workoutSetId),
    );
  };

  const handleRemoveSet = (
    workoutExerciseId: string,
    workoutSetId: string,
  ) => {
    if (!workoutDraft) {
      return;
    }

    const nextDraft = removeSetFromWorkoutExercise(
      workoutDraft,
      workoutExerciseId,
      workoutSetId,
    );
    setActiveWorkout(nextDraft);
  };

  // Sets can still be logged while paused (FR-6); only the clock stops.
  const handleTogglePause = () => {
    applyDraft(
      workoutDraft.pausedAt
        ? resumeWorkout(workoutDraft)
        : pauseWorkout(workoutDraft),
    );
  };

  const handleNotesChange = (value: string) => {
    if (!workoutDraft) {
      return;
    }

    const nextDraft = { ...workoutDraft, notes: value };
    setActiveWorkout(nextDraft);
  };

  // Discarding loses every logged set, so it always asks first.
  const handleDiscard = async () => {
    const confirmed = await confirmAction({
      title: t('workouts.discardTitle'),
      message: t('workouts.discardConfirm'),
      confirmLabel: t('workouts.discardWorkout'),
      cancelLabel: t('common.cancel'),
      destructive: true,
    });
    if (!confirmed) {
      return;
    }

    clearActiveWorkout();
    router.replace('/routines');
  };

  const setProgress = countWorkoutSets(workoutDraft);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.body}>
        {workoutDraft.routineName}
      </Text>
      <View style={styles.timerRow}>
        <Text
          style={[styles.timer, workoutDraft.pausedAt ? styles.timerPaused : null]}
        >
          {formatDuration(elapsedSeconds)}
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={handleTogglePause}
          hitSlop={8}
          style={styles.pauseButton}
        >
          <Text style={styles.pauseText}>
            {workoutDraft.pausedAt ? t('workouts.resume') : t('workouts.pause')}
          </Text>
        </Pressable>
      </View>
      {workoutDraft.pausedAt ? (
        <Text style={styles.pausedBadge}>{t('workouts.paused')}</Text>
      ) : null}
      <Text style={styles.meta}>
        {t('workouts.setsProgress', {
          done: setProgress.done,
          total: setProgress.total,
        })}
      </Text>
      <TextInput
        value={workoutDraft.notes ?? ''}
        onChangeText={handleNotesChange}
        placeholder={t('workouts.notesPlaceholder')}
        placeholderTextColor={colors.textSubtle}
        style={styles.notesInput}
        multiline
      />
      <View style={styles.restBar}>
        {restTimer.isRunning ? (
          <View style={styles.restRingRow}>
            <ProgressRing
              size={116}
              strokeWidth={9}
              progress={
                restTimer.total > 0 ? restTimer.remaining / restTimer.total : 0
              }
            >
              <Text style={styles.ringTime}>
                {formatDuration(restTimer.remaining)}
              </Text>
              <Text style={styles.ringLabel}>{t('workouts.rest')}</Text>
            </ProgressRing>
            <View style={styles.ringControls}>
              <Pressable
                onPress={() => restTimer.adjust(15)}
                hitSlop={6}
                style={styles.stepButton}
              >
                <Text style={styles.stepText}>+15</Text>
              </Pressable>
              <Pressable
                onPress={() => restTimer.adjust(-15)}
                hitSlop={6}
                style={styles.stepButton}
              >
                <Text style={styles.stepText}>−15</Text>
              </Pressable>
              <Pressable
                onPress={restTimer.skip}
                hitSlop={8}
                style={styles.skipButton}
              >
                <Text style={styles.skipText}>{t('workouts.skip')}</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <View style={styles.restColumn}>
            <Text style={styles.meta}>{t('workouts.restTimer')}</Text>
            <View style={styles.wheelRow}>
              <View style={styles.wheelGroup}>
                <WheelPicker
                  values={REST_MINUTES}
                  value={Math.floor(restDuration / 60)}
                  onChange={(m) => setRestDuration(m * 60 + (restDuration % 60))}
                  formatItem={pad2}
                />
                <Text style={styles.wheelUnit}>{t('workouts.min')}</Text>
              </View>
              <Text style={styles.wheelColon}>:</Text>
              <View style={styles.wheelGroup}>
                <WheelPicker
                  values={REST_SECONDS}
                  value={restDuration % 60}
                  onChange={(s) =>
                    setRestDuration(Math.floor(restDuration / 60) * 60 + s)
                  }
                  formatItem={pad2}
                />
                <Text style={styles.wheelUnit}>{t('workouts.sec')}</Text>
              </View>
              <Pressable
                onPress={() => restTimer.start(restDuration)}
                hitSlop={8}
                style={styles.startButton}
              >
                <Text style={styles.startText}>{t('workouts.start')}</Text>
              </Pressable>
            </View>
          </View>
        )}
      </View>
      {workoutDraft.exercises.map((exercise) => (
        <View key={exercise.id} style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardTitleGroup}>
              <Text style={styles.cardTitle}>{exercise.exerciseName}</Text>
              {exercise.supersetGroup !== undefined ? (
                <Text style={styles.supersetBadge}>
                  {t('routineDetail.superset', { group: exercise.supersetGroup })}
                </Text>
              ) : null}
            </View>
            <View style={styles.reorderRow}>
              <Pressable
                onPress={() => handleMoveExercise(exercise.id, 'up')}
                hitSlop={8}
              >
                <Text style={styles.reorderText}>↑</Text>
              </Pressable>
              <Pressable
                onPress={() => handleMoveExercise(exercise.id, 'down')}
                hitSlop={8}
              >
                <Text style={styles.reorderText}>↓</Text>
              </Pressable>
            </View>
          </View>
          <View style={styles.imagePlaceholder}>
            <Text style={styles.imagePlaceholderText}>
              {exercise.imagePlaceholderText ?? t('workouts.imagePlaceholder')}
            </Text>
          </View>
          <View style={styles.setList}>
            <View style={styles.setHeaderRow}>
              <Text style={[styles.colSet, styles.colLabel]}>{t('workouts.colSet')}</Text>
              <Text style={[styles.colPrev, styles.colLabel]}>{t('workouts.colPrev')}</Text>
              <Text style={[styles.colInput, styles.colLabel]}>
                {(workoutDraft.unit ?? 'kg').toUpperCase()}
              </Text>
              <Text style={[styles.colInput, styles.colLabel]}>{t('workouts.colReps')}</Text>
              <View style={styles.colCheck} />
            </View>
            {exercise.entries.map((set) => (
              <View
                key={set.id}
                style={[styles.setRow, set.done ? styles.setRowDone : null]}
              >
                <Pressable
                  onPress={() => handleCycleSetType(exercise.id, set.id)}
                  hitSlop={6}
                  style={styles.colSet}
                >
                  <Text style={styles.setNum}>{set.order}</Text>
                  {set.type !== 'normal' ? (
                    <Text style={styles.setTypeTag}>
                      {setTypeLabel(set.type, t)[0]}
                    </Text>
                  ) : null}
                </Pressable>
                <Text numberOfLines={1} style={[styles.colPrev, styles.prevText]}>
                  {prevSetLabel(
                    lastByExercise[exercise.exerciseId],
                    set.order,
                    workoutDraft.unit ?? 'kg',
                  )}
                </Text>
                <TextInput
                  keyboardType="decimal-pad"
                  value={set.weightKg}
                  placeholder={set.weightPlaceholder ?? '–'}
                  placeholderTextColor={colors.textSubtle}
                  onChangeText={(value) =>
                    handleSetChange(exercise.id, set.id, 'weightKg', value)
                  }
                  style={[styles.cellInput, styles.colInput]}
                />
                <TextInput
                  keyboardType="number-pad"
                  value={set.reps}
                  placeholder={set.repsPlaceholder ?? '–'}
                  placeholderTextColor={colors.textSubtle}
                  onChangeText={(value) =>
                    handleSetChange(exercise.id, set.id, 'reps', value)
                  }
                  style={[styles.cellInput, styles.colInput]}
                />
                <Pressable
                  onPress={() => handleToggleDone(exercise.id, set.id)}
                  hitSlop={6}
                  style={[styles.checkBox, set.done ? styles.checkBoxDone : null]}
                >
                  <Text
                    style={[
                      styles.checkMark,
                      set.done ? styles.checkMarkDone : null,
                    ]}
                  >
                    ✓
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => handleRemoveSet(exercise.id, set.id)}
                  hitSlop={6}
                  style={styles.removeSet}
                >
                  <Text style={styles.removeSetText}>✕</Text>
                </Pressable>
              </View>
            ))}
          </View>
          <View style={styles.cardActions}>
            <Pressable
              onPress={() => handleAddSet(exercise.id)}
              style={styles.addSetButton}
            >
              <Text style={styles.addSetText}>{`+ ${t('workouts.addSet')}`}</Text>
            </Pressable>
            <Pressable
              onPress={() => handleRemoveExercise(exercise.id)}
              hitSlop={8}
            >
              <Text style={styles.removeText}>{t('workouts.removeExercise')}</Text>
            </Pressable>
          </View>
        </View>
      ))}
      <Pressable
        onPress={() => setIsPickerVisible(true)}
        style={styles.addExerciseButton}
      >
        <Text style={styles.addExerciseText}>{`+ ${t('workouts.addExercise')}`}</Text>
      </Pressable>
      <ExercisePickerModal
        visible={isPickerVisible}
        onClose={() => setIsPickerVisible(false)}
        onSelect={handleAddExercise}
      />
      {finishError ? <Text style={styles.errorText}>{finishError}</Text> : null}
      {finishRefused ? (
        <Text style={styles.meta}>{t('workouts.saveRefusedHint')}</Text>
      ) : null}
      <Button
        label={isFinishing ? t('workouts.savingWorkout') : t('workouts.finishWorkout')}
        onPress={() => void finishWorkout()}
        disabled={isFinishing}
        fullWidth
      />
      <Button
        label={t('workouts.discardWorkout')}
        variant="danger"
        onPress={() => void handleDiscard()}
        disabled={isFinishing}
        fullWidth
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
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
  timer: {
    color: colors.primary,
    fontSize: 40,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  timerPaused: {
    color: colors.textMuted,
  },
  timerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  pauseButton: {
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  pauseText: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: '700',
  },
  pausedBadge: {
    alignSelf: 'flex-start',
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  meta: {
    ...commonStyles.meta,
  },
  card: {
    ...commonStyles.card,
    gap: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitleGroup: {
    flexShrink: 1,
    gap: 4,
  },
  cardTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '800',
    flexShrink: 1,
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
  reorderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  reorderText: {
    color: colors.primary,
    fontSize: 18,
    fontWeight: '900',
  },
  imagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 84,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceMuted,
  },
  imagePlaceholderText: {
    color: colors.textSubtle,
    fontSize: 14,
  },
  target: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 22,
  },
  setList: {
    gap: spacing.sm,
  },
  setHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingBottom: 2,
  },
  colLabel: {
    color: colors.textSubtle,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radii.sm,
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  setRowDone: {
    backgroundColor: colors.successSoft,
  },
  colSet: {
    width: 36,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  colPrev: {
    width: 64,
  },
  colInput: {
    flex: 1,
  },
  colCheck: {
    width: 36,
  },
  setNum: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
  },
  setTypeTag: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: '800',
  },
  prevText: {
    color: colors.textMuted,
    fontSize: 13,
    fontVariant: ['tabular-nums'],
  },
  cellInput: {
    minHeight: 40,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceMuted,
    color: colors.text,
    textAlign: 'center',
    fontSize: 16,
    paddingVertical: 6,
  },
  checkBox: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  checkBoxDone: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  checkMark: {
    color: colors.borderStrong,
    fontSize: 18,
    fontWeight: '900',
  },
  checkMarkDone: {
    color: colors.onPrimary,
  },
  removeSet: {
    width: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeSetText: {
    color: colors.textSubtle,
    fontSize: 14,
    fontWeight: '700',
  },
  removeText: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: '700',
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  addSetButton: {
    alignSelf: 'flex-start',
    paddingVertical: 6,
  },
  addSetText: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: '800',
  },
  addExerciseButton: {
    ...commonStyles.secondaryButton,
    borderColor: colors.primary,
  },
  addExerciseText: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: '800',
  },
  notesInput: {
    ...commonStyles.input,
    fontSize: 15,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  restBar: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceRaised,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
  },
  restColumn: {
    gap: spacing.sm,
  },
  wheelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  wheelGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  wheelUnit: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '700',
  },
  wheelColon: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '900',
  },
  restRingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.lg,
  },
  ringTime: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  ringLabel: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
  },
  ringControls: {
    flex: 1,
    gap: spacing.sm,
  },
  skipButton: {
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.sm,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
  },
  skipText: {
    color: colors.onPrimary,
    fontSize: 14,
    fontWeight: '800',
  },
  restRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  stepButton: {
    minWidth: 38,
    minHeight: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    paddingHorizontal: 8,
  },
  stepText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
  },
  startButton: {
    borderRadius: radii.sm,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
  },
  startText: {
    color: colors.onPrimary,
    fontSize: 14,
    fontWeight: '800',
  },
  errorText: {
    ...commonStyles.error,
  },
  link: {
    ...commonStyles.link,
  },
});
