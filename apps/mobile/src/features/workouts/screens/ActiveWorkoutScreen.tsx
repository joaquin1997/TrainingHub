import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import type { TFunction } from 'i18next';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { routinesClient } from '@/features/routines/api/routinesClient';
import { workoutsClient } from '@/features/workouts/api/workoutsClient';
import { ExercisePickerModal } from '@/features/exercises/components/ExercisePickerModal';
import { RestBar } from '@/features/workouts/components/RestBar';
import { useAuth } from '@/features/auth/AuthContext';
import { useSettings } from '@/features/settings/SettingsContext';
import { useActiveEnergyKcal } from '@/features/workouts/hooks/useActiveEnergyKcal';
import { useActiveWorkout } from '@/features/workouts/hooks/useActiveWorkout';
import {
  resolveActiveWorkoutEntry,
  resolveSwitchOutcome,
} from '@/features/workouts/utils/activeWorkoutEntry';
import { parseWorkoutAction } from '@/features/workouts/utils/workoutAction';
import { exerciseBlockLabels } from '@/features/routines/utils/exerciseBlockLabels';
import { Button } from '@/ui/Button';
import { Chip } from '@/ui/Chip';
import { StateView } from '@/ui/StateView';
import { confirmAction } from '@/lib/confirmAction';
import { formatDuration } from '@/lib/format';
import { isPermanentRejection } from '@/lib/http';
import { fromKg, roundWeight } from '@/lib/weight';
import { useElapsedSeconds } from '@/lib/useElapsedSeconds';
import { colors, commonStyles, fonts, radii, spacing } from '@/ui/theme';
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
  adjustRest,
  applyLastPerformance,
  clearActiveWorkout,
  countWorkoutSets,
  cycleWorkoutSetType,
  getActiveWorkout,
  moveWorkoutExercise,
  pauseWorkout,
  removeExerciseFromWorkout,
  removeSetFromWorkoutExercise,
  resolveRestSeconds,
  resumeWorkout,
  saveCompletedWorkout,
  setActiveWorkout,
  skipRest,
  startActiveWorkout,
  startRest,
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
  const { routineId, action, nextRoutineId } = useLocalSearchParams<{
    routineId?: string;
    action?: string;
    /** With `action=switch`: the routine to start after this one (spec 0019). */
    nextRoutineId?: string;
  }>();
  const linkAction = parseWorkoutAction(action);
  // Set below, after the early returns; lets the link effects reach them.
  const finishRef = useRef<(() => Promise<boolean>) | null>(null);
  const switchRef = useRef<((nextId: string) => Promise<void>) | null>(null);
  const scrollRef = useRef<ScrollView>(null);
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

  // "Finish" on the lock-screen status opens this screen with action=finish:
  // confirm first, then finish as from the button (spec 0012 FR-5). With no
  // set done, finishing shows the usual notice and saves nothing (EF-6).
  useEffect(() => {
    if (linkAction !== 'finish' || status !== 'ready' || !workoutDraft) {
      return;
    }

    router.setParams({ action: undefined });
    void confirmAction({
      title: t('workouts.finishTitle'),
      message: t('workouts.finishConfirm'),
      confirmLabel: t('workouts.finishWorkout'),
      cancelLabel: t('common.cancel'),
    }).then((confirmed) => {
      if (confirmed) {
        void finishRef.current?.();
      }
    });
    // Runs once per link; the draft is read through the ref at confirm time.
  }, [linkAction, status, workoutDraft === null]);

  // "Finish and start" from a routine, already confirmed there (spec 0019).
  useEffect(() => {
    if (linkAction !== 'switch' || status !== 'ready' || !workoutDraft) {
      return;
    }

    router.setParams({ action: undefined, nextRoutineId: undefined });
    if (nextRoutineId) {
      void switchRef.current?.(nextRoutineId);
    }
    // Runs once per link, like the finish link above.
  }, [linkAction, status, workoutDraft === null]);

  // Active energy from the person's health data, when known (spec 0017 AC-13).
  const activeKcal = useActiveEnergyKcal(workoutDraft?.clientId);
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
      <View style={styles.screen}>
        <StateView kind="loading" message={t('workouts.loadingRoutine')} />
      </View>
    );
  }

  if (status === 'error' || !workoutDraft) {
    return (
      <View style={styles.screen}>
        <StateView
          kind={errorMessage ? 'error' : 'empty'}
          icon="barbell-outline"
          message={errorMessage ?? t('workouts.startFromRoutine')}
          actionLabel={t('routineDetail.backToRoutines')}
          onAction={() => router.replace('/routines')}
        />
      </View>
    );
  }

  /**
   * Saves the workout. Goes to the summary, or with `nextRoutineId` starts that
   * routine instead (spec 0019). Resolves whether the save succeeded.
   */
  const finishWorkout = async (nextId?: string) => {
    if (countWorkoutSets(workoutDraft).done === 0) {
      setFinishError(t('workouts.markOneSet'));
      return false;
    }

    try {
      setIsFinishing(true);
      setFinishError(null);
      setFinishRefused(false);

      await workoutsClient.create(toCreateWorkoutSessionInput(workoutDraft));

      const workoutSession = toWorkoutSessionSkeleton(workoutDraft);

      saveCompletedWorkout(workoutDraft);
      void syncWorkoutCompletionToAppleHealth(workoutSession);

      if (nextId) {
        startNextRoutine(nextId);
      } else {
        clearActiveWorkout();
        // Replace, so Back from the summary does not land on a finished workout.
        router.replace('/workouts/summary');
      }
      return true;
    } catch (error) {
      setFinishError(
        error instanceof Error ? error.message : t('workouts.saveError'),
      );
      setFinishRefused(isPermanentRejection(error));
      return false;
    } finally {
      setIsFinishing(false);
    }
  };

  finishRef.current = () => finishWorkout();

  /** Drops the finished workout and lets the entry effect fetch the next one. */
  const startNextRoutine = (nextId: string) => {
    // Loading first, so the empty state never flashes between the two.
    setStatus('loading');
    clearActiveWorkout();
    router.setParams({ routineId: nextId });
  };

  // FR-4: saved with at least one set done, discarded otherwise. A failed save
  // keeps this workout on screen with the error, as on finish (EF-1); the
  // person arrived at the top, so the error is scrolled into view.
  switchRef.current = async (nextId: string) => {
    if (resolveSwitchOutcome(workoutDraft) === 'discard') {
      startNextRoutine(nextId);
      return;
    }

    if (!(await finishWorkout(nextId))) {
      requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
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

    // The exercise's rest in this workout, else the Settings default (FR-1).
    const rest = resolveRestSeconds(exercise ?? {}, settings.defaultRestSeconds);

    const nextDraft = toggleWorkoutSetDone(
      workoutDraft,
      workoutExerciseId,
      workoutSetId,
      becomingDone ? rest : undefined,
    );

    // Un-ticking leaves a running rest alone.
    setActiveWorkout(
      becomingDone ? startRest(nextDraft, workoutExerciseId, rest) : nextDraft,
    );
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
  const unit = workoutDraft.unit ?? 'kg';
  const isPaused = Boolean(workoutDraft.pausedAt);
  const blockLabels = exerciseBlockLabels(workoutDraft.exercises);
  const blocks: number[][] = [];
  blockLabels.forEach((label, index) => {
    if (label.superset === 'none' || label.superset === 'start') {
      blocks.push([index]);
    } else {
      blocks[blocks.length - 1]?.push(index);
    }
  });

  const renderExercise = (index: number, inSuperset: boolean) => {
    const exercise = workoutDraft.exercises[index];
    const label = blockLabels[index];
    if (!exercise || !label) {
      return null;
    }

    return (
      <View key={exercise.id} style={styles.exercise}>
        <View style={styles.exerciseHeader}>
          <View style={[styles.blockBadge, inSuperset ? styles.blockBadgeSuperset : null]}>
            <Text style={[styles.blockBadgeText, inSuperset ? styles.blockBadgeTextSuperset : null]}>
              {label.label}
            </Text>
          </View>
          <Text style={styles.exerciseTitle}>{exercise.exerciseName}</Text>
          <View style={styles.reorderRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="↑"
              onPress={() => handleMoveExercise(exercise.id, 'up')}
              hitSlop={6}
              style={styles.iconButton}
            >
              <Ionicons name="arrow-up" size={18} color={colors.textMuted} />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="↓"
              onPress={() => handleMoveExercise(exercise.id, 'down')}
              hitSlop={6}
              style={styles.iconButton}
            >
              <Ionicons name="arrow-down" size={18} color={colors.textMuted} />
            </Pressable>
          </View>
        </View>
        <View style={[styles.setList, inSuperset ? styles.indented : null]}>
          <View style={styles.setHeaderRow}>
            <Text style={[styles.colSet, styles.colLabel]}>{t('workouts.colSet')}</Text>
            <Text style={[styles.colPrev, styles.colLabel]}>{t('workouts.colPrev')}</Text>
            <Text style={[styles.colInput, styles.colLabel, styles.colCentered]}>
              {unit.toUpperCase()}
            </Text>
            <Text style={[styles.colInput, styles.colLabel, styles.colCentered]}>
              {t('workouts.colReps')}
            </Text>
            <Ionicons name="checkmark" size={14} color={colors.textMuted} style={styles.colCheckIcon} />
            <View style={styles.colRemove} />
          </View>
          {exercise.entries.map((set) => (
            <View key={set.id} style={[styles.setRow, set.done ? styles.setRowDone : null]}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={setTypeLabel(set.type, t)}
                onPress={() => handleCycleSetType(exercise.id, set.id)}
                hitSlop={4}
                style={[
                  styles.setMarker,
                  set.type === 'failure' ? styles.setMarkerFailure : null,
                  set.type === 'warmup' || set.type === 'drop' ? styles.setMarkerTyped : null,
                ]}
              >
                <Text
                  style={[
                    styles.setMarkerText,
                    set.type === 'failure' ? styles.setMarkerTextFailure : null,
                    set.type === 'warmup' || set.type === 'drop' ? styles.setMarkerTextTyped : null,
                  ]}
                >
                  {set.type === 'normal' ? set.order : setTypeLabel(set.type, t)[0]}
                </Text>
              </Pressable>
              <Text numberOfLines={1} style={[styles.colPrev, styles.prevText]}>
                {prevSetLabel(lastByExercise[exercise.exerciseId], set.order, unit)}
              </Text>
              <TextInput
                keyboardType="decimal-pad"
                value={set.weightKg}
                placeholder={set.weightPlaceholder ?? '–'}
                placeholderTextColor={colors.textSubtle}
                onChangeText={(value) =>
                  handleSetChange(exercise.id, set.id, 'weightKg', value)
                }
                style={[styles.cellInput, styles.colInput, set.done ? styles.cellInputDone : null]}
              />
              <TextInput
                keyboardType="number-pad"
                value={set.reps}
                placeholder={set.repsPlaceholder ?? '–'}
                placeholderTextColor={colors.textSubtle}
                onChangeText={(value) =>
                  handleSetChange(exercise.id, set.id, 'reps', value)
                }
                style={[styles.cellInput, styles.colInput, set.done ? styles.cellInputDone : null]}
              />
              <Pressable
                accessibilityRole="checkbox"
                accessibilityState={{ checked: set.done }}
                onPress={() => handleToggleDone(exercise.id, set.id)}
                hitSlop={4}
                style={[styles.checkBox, set.done ? styles.checkBoxDone : null]}
              >
                <Ionicons
                  name="checkmark"
                  size={20}
                  color={set.done ? colors.onPrimary : colors.borderStrong}
                />
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('common.remove')}
                onPress={() => handleRemoveSet(exercise.id, set.id)}
                hitSlop={6}
                style={styles.colRemove}
              >
                <Ionicons name="close" size={16} color={colors.textSubtle} />
              </Pressable>
            </View>
          ))}
          <View style={styles.cardActions}>
            <Button
              label={t('workouts.addSet')}
              icon="add"
              variant="ghost"
              onPress={() => handleAddSet(exercise.id)}
              style={styles.compactButton}
            />
            <Button
              label={t('workouts.removeExercise')}
              variant="ghost"
              destructive
              onPress={() => handleRemoveExercise(exercise.id)}
              style={styles.compactButton}
            />
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.screen}>
      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={styles.container}
        // The field being typed in stays above the keyboard (spec 0019 FR-6):
        // iOS insets the list by the keyboard and scrolls the field into view.
        automaticallyAdjustKeyboardInsets
        // A tap on ✓ or another field while typing acts on the first tap.
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
      >
        <View style={styles.headerCard}>
          <View style={styles.liveRow}>
            <View style={[styles.liveDot, isPaused ? styles.liveDotPaused : null]} />
            <Text style={styles.sectionLabel}>
              {isPaused ? t('workouts.paused') : t('routines.activeLabel')}
            </Text>
          </View>
          <Text style={styles.routineName}>{workoutDraft.routineName}</Text>
          <View style={styles.clockRow}>
            <Text style={[styles.clock, isPaused ? styles.clockPaused : null]}>
              {formatDuration(elapsedSeconds)}
            </Text>
            <Button
              label={isPaused ? t('workouts.resume') : t('workouts.pause')}
              icon={isPaused ? 'play' : 'pause'}
              variant="secondary"
              onPress={handleTogglePause}
            />
          </View>
          {activeKcal !== null ? (
            <View style={styles.energyRow}>
              <Ionicons name="flame-outline" size={16} color={colors.textMuted} />
              <Text style={styles.energyValue}>{Math.round(activeKcal)}</Text>
              <Text style={styles.energyUnit}>{t('workouts.kcalActive')}</Text>
            </View>
          ) : null}
          <View style={styles.progressRow}>
            <Text style={styles.meta}>{t('workouts.setsDoneShort')}</Text>
            <Text style={styles.progressCount}>
              {t('workouts.setsCountOf', { done: setProgress.done, total: setProgress.total })}
            </Text>
          </View>
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${setProgress.total > 0 ? Math.round((setProgress.done / setProgress.total) * 100) : 0}%`,
                },
              ]}
            />
          </View>
          <Text style={styles.hint}>{t('workouts.autosaveHint')}</Text>
        </View>
        {blocks.map((members) => {
          const first = blockLabels[members[0] ?? 0];
          const key = workoutDraft.exercises[members[0] ?? 0]?.id ?? String(members[0]);
          if (members.length === 1 || !first?.supersetIndex) {
            return (
              <View key={key} style={styles.card}>
                {members.map((index) => renderExercise(index, false))}
              </View>
            );
          }
          return (
            <View key={key} style={styles.card}>
              <Chip
                icon="flash"
                label={t('routineDetail.superset', { group: first.supersetIndex })}
                size="sm"
              />
              <View style={styles.supersetBody}>
                <View style={styles.rail} />
                <View style={styles.supersetMembers}>
                  {members.map((index) => renderExercise(index, true))}
                </View>
              </View>
            </View>
          );
        })}
        <Button
          label={t('workouts.addExercise')}
          icon="add-circle-outline"
          variant="secondary"
          onPress={() => setIsPickerVisible(true)}
          fullWidth
        />
        <ExercisePickerModal
          visible={isPickerVisible}
          onClose={() => setIsPickerVisible(false)}
          onSelect={handleAddExercise}
        />
        <TextInput
          value={workoutDraft.notes ?? ''}
          onChangeText={handleNotesChange}
          placeholder={t('workouts.notesPlaceholder')}
          placeholderTextColor={colors.textSubtle}
          style={styles.notesInput}
          multiline
        />
        {finishError ? <Text style={styles.errorText}>{finishError}</Text> : null}
        {finishRefused ? (
          <Text style={styles.meta}>{t('workouts.saveRefusedHint')}</Text>
        ) : null}
        <Button
          label={isFinishing ? t('workouts.savingWorkout') : t('workouts.finishWorkout')}
          icon="flag"
          onPress={() => void finishWorkout()}
          disabled={isFinishing}
          fullWidth
        />
        <Button
          label={t('workouts.discardWorkout')}
          icon="close-circle-outline"
          variant="ghost"
          destructive
          onPress={() => void handleDiscard()}
          disabled={isFinishing}
          style={styles.centered}
        />
      </ScrollView>
      {workoutDraft.rest ? (
        <RestBar
          rest={workoutDraft.rest}
          // Read at tap time: the draft may have changed since this render.
          onAdjust={(delta) => {
            const current = getActiveWorkout();
            if (current) {
              setActiveWorkout(adjustRest(current, delta));
            }
          }}
          onSkip={() => {
            const current = getActiveWorkout();
            if (current) {
              setActiveWorkout(skipRest(current));
            }
          }}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    ...commonStyles.screen,
  },
  scroll: {
    flex: 1,
  },
  container: {
    ...commonStyles.scrollContent,
  },
  centered: {
    alignSelf: 'center',
  },
  sectionLabel: {
    ...commonStyles.sectionLabel,
  },
  meta: {
    ...commonStyles.meta,
  },
  hint: {
    color: colors.textSubtle,
    fontSize: 12,
    lineHeight: 16,
  },
  headerCard: {
    ...commonStyles.card,
    gap: spacing.sm,
  },
  liveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  liveDotPaused: {
    backgroundColor: colors.textMuted,
  },
  routineName: {
    ...commonStyles.cardTitle,
    fontSize: 20,
    lineHeight: 26,
  },
  clockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.background,
    paddingVertical: spacing.sm,
    paddingLeft: spacing.lg,
    paddingRight: spacing.sm,
  },
  clock: {
    ...commonStyles.figureLarge,
    color: colors.primary,
    flexShrink: 1,
  },
  clockPaused: {
    color: colors.textMuted,
  },
  energyRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.xs,
  },
  energyValue: {
    ...commonStyles.figure,
    fontSize: 18,
    lineHeight: 22,
  },
  energyUnit: {
    color: colors.textMuted,
    fontSize: 13,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  progressCount: {
    color: colors.primary,
    fontFamily: fonts.displayBold,
    fontSize: 15,
    fontVariant: ['tabular-nums'],
  },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.surfaceRaised,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  card: {
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
  indented: {
    marginLeft: 36,
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
    backgroundColor: colors.surface,
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
  reorderRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  iconButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceRaised,
  },
  setList: {
    gap: spacing.xs,
  },
  setHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: 4,
  },
  colLabel: {
    ...commonStyles.sectionLabel,
    fontSize: 10,
  },
  colCentered: {
    textAlign: 'center',
  },
  colSet: {
    width: 36,
  },
  colPrev: {
    width: 64,
  },
  colInput: {
    flex: 1,
    flexBasis: 0,
    minWidth: 0,
  },
  colCheckIcon: {
    width: 44,
    textAlign: 'center',
  },
  colRemove: {
    width: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  setRow: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radii.md,
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  setRowDone: {
    backgroundColor: colors.successSoft,
  },
  setMarker: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceRaised,
  },
  setMarkerTyped: {
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  setMarkerFailure: {
    backgroundColor: colors.accentSoft,
  },
  setMarkerText: {
    color: colors.text,
    fontFamily: fonts.displayBold,
    fontSize: 15,
    fontVariant: ['tabular-nums'],
  },
  setMarkerTextTyped: {
    color: colors.textMuted,
  },
  setMarkerTextFailure: {
    color: colors.accent,
  },
  prevText: {
    color: colors.textMuted,
    fontFamily: fonts.display,
    fontSize: 13,
    fontVariant: ['tabular-nums'],
  },
  cellInput: {
    minHeight: 44,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceRaised,
    color: colors.text,
    textAlign: 'center',
    fontFamily: fonts.displayBold,
    fontSize: 18,
    fontVariant: ['tabular-nums'],
    paddingVertical: 6,
  },
  cellInputDone: {
    backgroundColor: 'transparent',
    borderColor: 'transparent',
  },
  checkBox: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.sm,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surfaceRaised,
  },
  checkBoxDone: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  compactButton: {
    minHeight: 44,
    paddingHorizontal: spacing.sm,
  },
  notesInput: {
    ...commonStyles.input,
    fontSize: 15,
    minHeight: 72,
    // Long notes scroll inside the field, which keeps the caret in view.
    maxHeight: 160,
    textAlignVertical: 'top',
  },
  errorText: {
    ...commonStyles.error,
  },
});
