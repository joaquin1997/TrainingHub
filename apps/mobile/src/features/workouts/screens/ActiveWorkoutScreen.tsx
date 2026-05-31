import { Link, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
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
import { formatDuration } from '@/lib/format';
import { useElapsedSeconds } from '@/lib/useElapsedSeconds';
import { useRestTimer } from '@/lib/useRestTimer';
import { colors, commonStyles, radii, spacing } from '@/ui/theme';

const REST_PRESETS = [60, 90, 120];
import type {
  Exercise,
  ExerciseLastPerformance,
  WorkoutSetType,
} from '@workout/domain';
import {
  notifyAppleWorkoutFinished,
  notifyAppleWorkoutStarted,
  syncWorkoutCompletionToAppleHealth,
} from '@/features/health/integrations/appleWorkoutIntegration';
import {
  addExerciseToWorkout,
  addSetToWorkoutExercise,
  applyLastPerformance,
  clearActiveWorkout,
  countWorkoutSets,
  cycleWorkoutSetType,
  getActiveWorkout,
  moveWorkoutExercise,
  moveWorkoutSet,
  removeExerciseFromWorkout,
  removeSetFromWorkoutExercise,
  saveCompletedWorkout,
  setActiveWorkout,
  startActiveWorkout,
  toCreateWorkoutSessionInput,
  toggleWorkoutSetDone,
  toWorkoutSessionSkeleton,
  updateWorkoutSetDraft,
  type WorkoutSessionDraft,
} from '@/features/workouts/state/workoutDraftStore';

function renderLastSet(
  performance: ExerciseLastPerformance | null | undefined,
  order: number,
) {
  const last = performance?.sets.find((set) => set.order === order);

  if (!last) {
    return null;
  }

  return (
    <Text style={styles.lastText}>
      Last: {last.weightKg ?? '-'} kg x {last.reps ?? '-'}
    </Text>
  );
}

function setTypeLabel(type: WorkoutSetType) {
  switch (type) {
    case 'warmup':
      return 'Warmup';
    case 'drop':
      return 'Drop';
    case 'failure':
      return 'Failure';
    default:
      return 'Normal';
  }
}

export function ActiveWorkoutScreen() {
  const { routineId } = useLocalSearchParams<{ routineId?: string }>();
  const [workoutDraft, setWorkoutDraft] = useState<WorkoutSessionDraft | null>(
    null,
  );
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>(
    'loading',
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isFinishing, setIsFinishing] = useState(false);
  const [finishError, setFinishError] = useState<string | null>(null);
  const [isPickerVisible, setIsPickerVisible] = useState(false);
  const [lastByExercise, setLastByExercise] = useState<
    Record<string, ExerciseLastPerformance | null>
  >({});
  const [restDuration, setRestDuration] = useState(90);
  const restTimer = useRestTimer(() => Vibration.vibrate([0, 400, 200, 400]));

  useEffect(() => {
    if (!routineId) {
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

        setWorkoutDraft(startActiveWorkout(routine));
        setStatus('ready');
      })
      .catch((error: unknown) => {
        if (!active) {
          return;
        }

        setErrorMessage(
          error instanceof Error ? error.message : 'Could not load routine',
        );
        setStatus('error');
      });

    return () => {
      active = false;
    };
  }, [routineId]);

  useEffect(() => {
    if (workoutDraft) {
      void notifyAppleWorkoutStarted(workoutDraft);
    }
  }, [workoutDraft]);

  const elapsedSeconds = useElapsedSeconds(workoutDraft?.startedAt);

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
        setWorkoutDraft(next);
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
        <Text style={styles.meta}>Loading routine...</Text>
      </View>
    );
  }

  if (status === 'error' || !workoutDraft) {
    return (
      <View style={styles.container}>
        <Text style={styles.meta}>
          {errorMessage ??
            'Start this flow from a routine so the workout session can be created from a routine template.'}
        </Text>
        <Link href="/routines" style={styles.link}>
          Back to routines
        </Link>
      </View>
    );
  }

  const finishWorkout = async () => {
    try {
      setIsFinishing(true);
      setFinishError(null);

      await workoutsClient.create(toCreateWorkoutSessionInput(workoutDraft));

      const workoutSession = toWorkoutSessionSkeleton(workoutDraft);

      saveCompletedWorkout(workoutDraft);
      clearActiveWorkout();

      void notifyAppleWorkoutFinished(
        workoutDraft,
        workoutSession.completedAt ?? workoutSession.updatedAt,
      );
      void syncWorkoutCompletionToAppleHealth(workoutSession);
      router.push('/workouts/summary');
    } catch (error) {
      setFinishError(
        error instanceof Error ? error.message : 'Could not save the workout.',
      );
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

    setWorkoutDraft(nextDraft);
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

    const nextDraft = toggleWorkoutSetDone(
      workoutDraft,
      workoutExerciseId,
      workoutSetId,
    );

    setWorkoutDraft(nextDraft);
    setActiveWorkout(nextDraft);

    if (becomingDone) {
      // Prefer the routine's per-exercise rest, falling back to the picker value.
      restTimer.start(exercise?.restSeconds ?? restDuration);
    }
  };

  const applyDraft = (nextDraft: WorkoutSessionDraft) => {
    setWorkoutDraft(nextDraft);
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

  const handleMoveSet = (
    workoutExerciseId: string,
    workoutSetId: string,
    direction: 'up' | 'down',
  ) => {
    if (!workoutDraft) {
      return;
    }

    applyDraft(
      moveWorkoutSet(workoutDraft, workoutExerciseId, workoutSetId, direction),
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
    setWorkoutDraft(nextDraft);
    setActiveWorkout(nextDraft);
  };

  const handleNotesChange = (value: string) => {
    if (!workoutDraft) {
      return;
    }

    const nextDraft = { ...workoutDraft, notes: value };
    setWorkoutDraft(nextDraft);
    setActiveWorkout(nextDraft);
  };

  const handleDiscard = () => {
    clearActiveWorkout();
    router.replace('/routines');
  };

  const setProgress = countWorkoutSets(workoutDraft);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.body}>
        {workoutDraft.routineName}
      </Text>
      <Text style={styles.timer}>{formatDuration(elapsedSeconds)}</Text>
      <Text style={styles.meta}>
        {setProgress.done}/{setProgress.total} sets done · auto-saved, resume anytime
      </Text>
      <TextInput
        value={workoutDraft.notes ?? ''}
        onChangeText={handleNotesChange}
        placeholder="Workout notes (optional)"
        placeholderTextColor={colors.textSubtle}
        style={styles.notesInput}
        multiline
      />
      <View style={styles.restBar}>
        {restTimer.isRunning ? (
          <View style={styles.restColumn}>
            <View style={styles.restRow}>
              <Text style={styles.restTime}>
                {formatDuration(restTimer.remaining)}
              </Text>
              <View style={styles.restControls}>
                <Pressable
                  onPress={() => restTimer.adjust(-15)}
                  hitSlop={6}
                  style={styles.stepButton}
                >
                  <Text style={styles.stepText}>−15</Text>
                </Pressable>
                <Pressable
                  onPress={() => restTimer.adjust(15)}
                  hitSlop={6}
                  style={styles.stepButton}
                >
                  <Text style={styles.stepText}>+15</Text>
                </Pressable>
                <Pressable onPress={restTimer.skip} hitSlop={8}>
                  <Text style={styles.addSetText}>Skip</Text>
                </Pressable>
              </View>
            </View>
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${
                      restTimer.total > 0
                        ? (restTimer.remaining / restTimer.total) * 100
                        : 0
                    }%`,
                  },
                ]}
              />
            </View>
          </View>
        ) : (
          <View style={styles.restColumn}>
            <View style={styles.restRow}>
              <Text style={styles.meta}>Rest timer</Text>
              <View style={styles.restControls}>
                <Pressable
                  onPress={() => setRestDuration((d) => Math.max(15, d - 15))}
                  hitSlop={6}
                  style={styles.stepButton}
                >
                  <Text style={styles.stepText}>−</Text>
                </Pressable>
                <Text style={styles.restValue}>
                  {formatDuration(restDuration)}
                </Text>
                <Pressable
                  onPress={() => setRestDuration((d) => d + 15)}
                  hitSlop={6}
                  style={styles.stepButton}
                >
                  <Text style={styles.stepText}>+</Text>
                </Pressable>
                <Pressable
                  onPress={() => restTimer.start(restDuration)}
                  hitSlop={8}
                  style={styles.startButton}
                >
                  <Text style={styles.startText}>Start</Text>
                </Pressable>
              </View>
            </View>
            <View style={styles.presetRow}>
              {REST_PRESETS.map((seconds) => (
                <Pressable
                  key={seconds}
                  onPress={() => setRestDuration(seconds)}
                  hitSlop={6}
                  style={[
                    styles.presetChip,
                    restDuration === seconds ? styles.presetChipActive : null,
                  ]}
                >
                  <Text
                    style={[
                      styles.restPreset,
                      restDuration === seconds ? styles.restPresetActive : null,
                    ]}
                  >
                    {seconds}s
                  </Text>
                </Pressable>
              ))}
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
                  Superset {exercise.supersetGroup}
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
              {exercise.imagePlaceholderText ?? 'Image placeholder'}
            </Text>
          </View>
          <View style={styles.setList}>
            {exercise.entries.map((set) => (
              <View key={set.id} style={styles.setCard}>
                <View style={styles.setHeader}>
                  <View style={styles.setHeaderLeft}>
                    <Text style={styles.setTitle}>Set {set.order}</Text>
                    <Pressable
                      onPress={() => handleCycleSetType(exercise.id, set.id)}
                      hitSlop={6}
                    >
                      <Text
                        style={[
                          styles.typeBadge,
                          set.type !== 'normal' ? styles.typeBadgeActive : null,
                        ]}
                      >
                        {setTypeLabel(set.type)}
                      </Text>
                    </Pressable>
                  </View>
                  <View style={styles.reorderRow}>
                    <Pressable
                      onPress={() => handleMoveSet(exercise.id, set.id, 'up')}
                      hitSlop={8}
                    >
                      <Text style={styles.reorderText}>↑</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => handleMoveSet(exercise.id, set.id, 'down')}
                      hitSlop={8}
                    >
                      <Text style={styles.reorderText}>↓</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => handleRemoveSet(exercise.id, set.id)}
                      hitSlop={8}
                    >
                      <Text style={styles.removeText}>Remove</Text>
                    </Pressable>
                  </View>
                </View>
                <Text style={styles.setTarget}>
                  Target: {set.minReps ?? '?'}-{set.maxReps ?? '?'} reps
                  {set.targetWeight !== undefined ? `, ${set.targetWeight} kg` : ''}
                </Text>
                {renderLastSet(lastByExercise[exercise.exerciseId], set.order)}
                <View style={styles.inputsRow}>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Actual reps</Text>
                    <TextInput
                      keyboardType="number-pad"
                      value={set.reps}
                      placeholder={set.repsPlaceholder ?? ''}
                      placeholderTextColor={colors.textSubtle}
                      onChangeText={(value) =>
                        handleSetChange(exercise.id, set.id, 'reps', value)
                      }
                      style={styles.input}
                    />
                  </View>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Actual kg</Text>
                    <TextInput
                      keyboardType="decimal-pad"
                      value={set.weightKg}
                      placeholder={set.weightPlaceholder ?? ''}
                      placeholderTextColor={colors.textSubtle}
                      onChangeText={(value) =>
                        handleSetChange(exercise.id, set.id, 'weightKg', value)
                      }
                      style={styles.input}
                    />
                  </View>
                </View>
                <Pressable
                  onPress={() => handleToggleDone(exercise.id, set.id)}
                  style={[
                    styles.doneToggle,
                    set.done ? styles.doneToggleActive : null,
                  ]}
                >
                  <Text
                    style={[
                      styles.doneToggleText,
                      set.done ? styles.doneToggleTextActive : null,
                    ]}
                  >
                    {set.done ? '✓ Done' : 'Mark done'}
                  </Text>
                </Pressable>
              </View>
            ))}
          </View>
          <View style={styles.cardActions}>
            <Pressable
              onPress={() => handleAddSet(exercise.id)}
              style={styles.addSetButton}
            >
              <Text style={styles.addSetText}>+ Add set</Text>
            </Pressable>
            <Pressable
              onPress={() => handleRemoveExercise(exercise.id)}
              hitSlop={8}
            >
              <Text style={styles.removeText}>Remove exercise</Text>
            </Pressable>
          </View>
        </View>
      ))}
      <Pressable
        onPress={() => setIsPickerVisible(true)}
        style={styles.addExerciseButton}
      >
        <Text style={styles.addExerciseText}>+ Add exercise</Text>
      </Pressable>
      <ExercisePickerModal
        visible={isPickerVisible}
        onClose={() => setIsPickerVisible(false)}
        onSelect={handleAddExercise}
      />
      {finishError ? <Text style={styles.errorText}>{finishError}</Text> : null}
      <Pressable
        onPress={() => void finishWorkout()}
        disabled={isFinishing}
        style={[styles.button, isFinishing ? styles.buttonDisabled : null]}
      >
        <Text style={styles.buttonText}>
          {isFinishing ? 'Saving workout...' : 'Finish workout'}
        </Text>
      </Pressable>
      <Pressable
        onPress={handleDiscard}
        disabled={isFinishing}
        style={styles.discardButton}
      >
        <Text style={styles.discardButtonText}>Discard workout</Text>
      </Pressable>
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
  setCard: {
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 10,
  },
  setHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  setHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  typeBadge: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radii.sm,
    paddingHorizontal: 8,
    paddingVertical: 2,
    overflow: 'hidden',
  },
  typeBadgeActive: {
    color: colors.accent,
    borderColor: colors.accent,
    backgroundColor: colors.accentSoft,
  },
  setTitle: {
    color: colors.text,
    fontSize: 15,
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
  setTarget: {
    color: colors.textMuted,
    fontSize: 13,
  },
  lastText: {
    color: colors.primary,
    fontSize: 13,
  },
  inputsRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  inputGroup: {
    flex: 1,
    gap: spacing.sm,
  },
  inputLabel: {
    color: colors.textMuted,
    fontSize: 13,
  },
  input: {
    ...commonStyles.input,
  },
  button: {
    ...commonStyles.primaryButton,
  },
  buttonText: {
    ...commonStyles.primaryButtonText,
  },
  buttonDisabled: {
    ...commonStyles.disabled,
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
  progressTrack: {
    height: 6,
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceMuted,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: radii.sm,
    backgroundColor: colors.primary,
  },
  restRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  restControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
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
  restValue: {
    minWidth: 56,
    textAlign: 'center',
    color: colors.primary,
    fontSize: 17,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
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
  presetRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  presetChip: {
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
  },
  presetChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.surface,
  },
  restTime: {
    color: colors.primary,
    fontSize: 22,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  restPreset: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: '700',
  },
  restPresetActive: {
    color: colors.primary,
  },
  doneToggle: {
    alignSelf: 'flex-start',
    minHeight: 44,
    justifyContent: 'center',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  doneToggleActive: {
    backgroundColor: colors.successSoft,
    borderColor: colors.success,
  },
  doneToggleText: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: '700',
  },
  doneToggleTextActive: {
    color: colors.success,
  },
  discardButton: {
    ...commonStyles.secondaryButton,
    borderColor: colors.danger,
    backgroundColor: colors.dangerSoft,
  },
  discardButtonText: {
    color: colors.danger,
    fontSize: 15,
    fontWeight: '800',
  },
  errorText: {
    ...commonStyles.error,
  },
  link: {
    ...commonStyles.link,
  },
});
