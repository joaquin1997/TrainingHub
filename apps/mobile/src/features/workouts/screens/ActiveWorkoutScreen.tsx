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
import { ExerciseThumb } from '@/features/exercises/components/ExerciseThumb';
import { exercisesClient } from '@/features/exercises/api/exercisesClient';
import { ExercisePickerModal } from '@/features/exercises/components/ExercisePickerModal';
import {
  previousSetLabel,
  WorkoutSetHeader,
  WorkoutSetRow,
} from '@/features/workouts/components/WorkoutSetRow';
import { useExerciseReplacement } from '@/features/workouts/hooks/useExerciseReplacement';
import {
  addApproachSets,
  canAddApproachSets,
  type ApproachSetsOutcome,
} from '@/features/workouts/state/approachSetsDraft';
import { RestBar } from '@/features/workouts/components/RestBar';
import { WarmUpChecklist } from '@/features/workouts/components/WarmUpChecklist';
import { toggleWarmUpItem } from '@/features/workouts/state/warmUpDraft';
import { RestEditorSheet } from '@/features/workouts/components/RestEditorSheet';
import { nextSetToDo } from '@/features/workouts/restTimer/nextSetToDo';
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
import { useElapsedSeconds } from '@/lib/useElapsedSeconds';
import { colors, commonStyles, fonts, radii, spacing } from '@/ui/theme';
import type { Exercise, ExerciseLastPerformance } from '@workout/domain';
import { syncWorkoutCompletionToAppleHealth } from '@/features/health/integrations/appleWorkoutIntegration';
import {
  addExerciseToWorkout,
  addSetToWorkoutExercise,
  adjustRest,
  applyLastPerformance,
  clearActiveWorkout,
  completeSet,
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
  setExerciseRest,
  skipRest,
  startActiveWorkout,
  toCreateWorkoutSessionInput,
  toggleWorkoutSetDone,
  toWorkoutSessionSkeleton,
  updateWorkoutSetDraft,
  type RunningRest,
  type SetDraftField,
  type WorkoutSessionDraft,
} from '@/features/workouts/state/workoutDraftStore';

/** The rest chip of an exercise: "2:00", or "Off" for no rest. */
function restChipLabel(seconds: number, t: TFunction) {
  return seconds > 0 ? formatDuration(seconds) : t('workouts.restOff');
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
  // For bringing the next set into view when a rest ends (spec 0018 FR-5).
  const contentRef = useRef<View>(null);
  const setRowRefs = useRef(new Map<string, View>());
  const viewportHeightRef = useRef(0);
  const workoutDraft = useActiveWorkout();
  const lastRestRef = useRef<RunningRest | undefined>(workoutDraft?.rest);
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
  const replacement = useExerciseReplacement(workoutDraft);
  // The exercise whose rest is being changed (spec 0018 FR-2).
  const [restEditorFor, setRestEditorFor] = useState<string | null>(null);
  // Why approach sets could not be added to an exercise (spec 0024 EF-1).
  const [approachNotice, setApproachNotice] = useState<{
    workoutExerciseId: string;
    outcome: Exclude<ApproachSetsOutcome, 'added'>;
  } | null>(null);
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

  // Images of the exercises in the workout (catalog image or own photo).
  const [imageByExercise, setImageByExercise] = useState<Record<string, string>>({});
  useEffect(() => {
    if (!exerciseIdsKey) {
      return;
    }

    let active = true;
    for (const id of exerciseIdsKey.split(',')) {
      void exercisesClient
        .getById(id)
        .then((exercise) => {
          if (active && exercise.imageUrl) {
            setImageByExercise((current) => ({ ...current, [id]: exercise.imageUrl as string }));
          }
        })
        .catch(() => undefined);
    }

    return () => {
      active = false;
    };
  }, [exerciseIdsKey]);

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

  // A rest that ended or was skipped while this screen is open brings the
  // next set to do to about a third of the screen (FR-5). A new rest replacing
  // a running one, a finish or a discard do not scroll.
  useEffect(() => {
    const previous = lastRestRef.current;
    lastRestRef.current = workoutDraft?.rest;
    if (!previous || !workoutDraft || workoutDraft.rest) {
      return;
    }

    const target = nextSetToDo(workoutDraft, previous.workoutExerciseId);
    if (!target) {
      return;
    }

    // After the frame that removes the rest bar, so the viewport is final.
    requestAnimationFrame(() => {
      const row = setRowRefs.current.get(target.workoutSetId);
      const content = contentRef.current;
      if (!row || !content) {
        return;
      }

      row.measureLayout(
        content,
        (_x, y) => {
          scrollRef.current?.scrollTo({
            y: Math.max(0, y - viewportHeightRef.current / 3),
            animated: true,
          });
        },
        () => {},
      );
    });
  }, [workoutDraft]);

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
    field: SetDraftField,
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

    // Ticking starts the exercise's rest in this workout, else the Settings
    // default (FR-1) — the same rule as a tick from the watch (spec 0025).
    // Un-ticking leaves a running rest alone.
    setActiveWorkout(
      becomingDone
        ? completeSet(
            workoutDraft,
            workoutExerciseId,
            workoutSetId,
            settings.defaultRestSeconds,
          )
        : toggleWorkoutSetDone(workoutDraft, workoutExerciseId, workoutSetId),
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

  const handleAddApproachSets = (workoutExerciseId: string) => {
    const { draft, outcome } = addApproachSets(workoutDraft, workoutExerciseId);
    setApproachNotice(outcome === 'added' ? null : { workoutExerciseId, outcome });
    if (outcome === 'added') {
      applyDraft(draft);
    }
  };

  const handleAddExercise = (exercise: Exercise) => {
    if (!workoutDraft) {
      return;
    }

    applyDraft(
      addExerciseToWorkout(workoutDraft, {
        id: exercise.id,
        name: exercise.name,
        trackingType: exercise.trackingType,
        isUnilateral: exercise.isUnilateral,
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

  const restEditorExercise = restEditorFor
    ? workoutDraft.exercises.find((exercise) => exercise.id === restEditorFor)
    : undefined;

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
          {imageByExercise[exercise.exerciseId] ? (
            <ExerciseThumb imageUrl={imageByExercise[exercise.exerciseId]} size={40} />
          ) : null}
          <View style={styles.exerciseTitleColumn}>
            <Text style={styles.exerciseTitle}>{exercise.exerciseName}</Text>
            <View style={styles.restChipRow}>
              <Chip
                icon="timer-outline"
                size="sm"
                label={restChipLabel(
                  resolveRestSeconds(exercise, settings.defaultRestSeconds),
                  t,
                )}
                onPress={() => setRestEditorFor(exercise.id)}
              />
            </View>
          </View>
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
          <WorkoutSetHeader
            trackingType={exercise.trackingType}
            unilateral={exercise.isUnilateral}
            unit={unit}
          />
          {exercise.entries.map((set) => (
            // The row ref lets the screen scroll the next set into view (0018).
            <View
              key={set.id}
              ref={(node) => {
                if (node) {
                  setRowRefs.current.set(set.id, node);
                } else {
                  setRowRefs.current.delete(set.id);
                }
              }}
            >
              <WorkoutSetRow
                set={set}
                trackingType={exercise.trackingType}
                unilateral={exercise.isUnilateral}
                unit={unit}
                previousLabel={previousSetLabel(
                  lastByExercise[exercise.exerciseId],
                  set.order,
                  exercise.trackingType,
                  unit,
                )}
                onChange={(field, value) => handleSetChange(exercise.id, set.id, field, value)}
                onCycleType={() => handleCycleSetType(exercise.id, set.id)}
                onToggleDone={() => handleToggleDone(exercise.id, set.id)}
                onRemove={() => handleRemoveSet(exercise.id, set.id)}
              />
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
            {canAddApproachSets(exercise) ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('workouts.addApproachSets')}
                onPress={() => handleAddApproachSets(exercise.id)}
                hitSlop={6}
                style={styles.iconButton}
              >
                <Ionicons name="flame-outline" size={18} color={colors.textMuted} />
              </Pressable>
            ) : null}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('workouts.replaceExercise')}
              onPress={() => replacement.start(exercise.id)}
              hitSlop={6}
              style={styles.iconButton}
            >
              <Ionicons name="swap-horizontal" size={18} color={colors.textMuted} />
            </Pressable>
            <Button
              label={t('workouts.removeExercise')}
              variant="ghost"
              destructive
              onPress={() => handleRemoveExercise(exercise.id)}
              style={styles.compactButton}
            />
          </View>
          {approachNotice?.workoutExerciseId === exercise.id ? (
            <Text style={styles.meta}>
              {approachNotice.outcome === 'noWeight'
                ? t('workouts.approachNoWeight')
                : t('workouts.approachTooLight')}
            </Text>
          ) : null}
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
        onLayout={(event) => {
          viewportHeightRef.current = event.nativeEvent.layout.height;
        }}
        // The field being typed in stays above the keyboard (spec 0019 FR-6):
        // iOS insets the list by the keyboard and scrolls the field into view.
        automaticallyAdjustKeyboardInsets
        // A tap on ✓ or another field while typing acts on the first tap.
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
      >
        <View ref={contentRef} collapsable={false} style={styles.content}>
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
          {/* The warm-up block first; ticking is not a set (spec 0024 FR-6). */}
          <WarmUpChecklist
            items={(workoutDraft.warmUp ?? []).map((item) => ({ ...item, key: item.id }))}
            onToggle={(itemId) => applyDraft(toggleWarmUpItem(workoutDraft, itemId))}
          />
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
            {...(replacement.pickerProps ?? {
              visible: isPickerVisible,
              onClose: () => setIsPickerVisible(false),
              onSelect: handleAddExercise,
            })}
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
        </View>
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
      <RestEditorSheet
        visible={restEditorExercise !== undefined}
        exerciseName={restEditorExercise?.exerciseName ?? ''}
        seconds={
          restEditorExercise
            ? resolveRestSeconds(restEditorExercise, settings.defaultRestSeconds)
            : settings.defaultRestSeconds
        }
        onSave={(seconds) => {
          const current = getActiveWorkout();
          if (current && restEditorFor) {
            setActiveWorkout(setExerciseRest(current, restEditorFor, seconds));
          }
        }}
        onClose={() => setRestEditorFor(null)}
      />
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
  content: {
    gap: spacing.lg,
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
  exerciseTitleColumn: {
    flex: 1,
    gap: spacing.xs,
  },
  exerciseTitle: {
    ...commonStyles.cardTitle,
    paddingTop: 2,
  },
  restChipRow: {
    flexDirection: 'row',
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
  cardActions: {
    flexDirection: 'row',
    // Three actions may not fit an indented superset card (spec 0020).
    flexWrap: 'wrap',
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
