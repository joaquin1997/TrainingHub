import { ComparisonBadge } from '@/features/workouts/liveRecords/ComparisonBadge';
import { ComparisonStatus } from '@/features/workouts/liveRecords/ComparisonStatus';
import { createWorkoutFinishGuard } from '@/features/workouts/utils/workoutFinishGuard';
import { warmUpMetadataOf } from '@/lib/warmUpContext';
import { SetTypeSheet } from '@/features/workouts/components/SetTypeSheet';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import type { TFunction } from 'i18next';
import { type ComponentRef, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
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
import { RecordNotice } from '@/features/workouts/liveRecords/RecordNotice';
import { useLiveRecords } from '@/features/workouts/liveRecords/useLiveRecords';
import {
  canAddApproachSets,
  confirmApproachSets,
  previewApproachSets,
  precedingWorkoutWarmUpMetadata,
  removeGeneratedWarmUps,
  warmUpActionFor,
  type ApproachSetsPreview,
} from '@/features/workouts/state/approachSetsDraft';
import { pairedPerformance } from '@/features/workouts/state/lastTimeByKind';
import { RestBar } from '@/features/workouts/components/RestBar';
import { WarmUpChecklist } from '@/features/workouts/components/WarmUpChecklist';
import { toggleWarmUpItem } from '@/features/workouts/state/warmUpDraft';
import { ApproachSetsPreviewSheet } from '@/features/workouts/components/ApproachSetsPreviewSheet';
import { WarmUpActionButton } from '@/features/workouts/components/WarmUpActionButton';
import {
  moveWorkoutExerciseInGroups,
  removeWorkoutExerciseInGroups,
} from '@/features/workouts/superset/groupedDraft';
import {
  completeSetInRounds,
  roundIndexOf,
  roundStatus,
} from '@/features/workouts/superset/rounds';
import { RestEditorSheet } from '@/features/workouts/components/RestEditorSheet';
import { StickyWorkoutHeader } from '@/features/workouts/components/StickyWorkoutHeader';
import { stickyHeaderModel } from '@/features/workouts/utils/stickyHeader';
import { setNumberOf } from '@/features/workouts/utils/setNumber';
import { currentSetToDo } from '@/features/workouts/restTimer/nextSetToDo';
import { nextSetLabel } from '@/features/workouts/restTimer/nextSetLabel';
import { useAuth } from '@/features/auth/AuthContext';
import { useSettings } from '@/features/settings/SettingsContext';
import { useActiveEnergyKcal } from '@/features/workouts/hooks/useActiveEnergyKcal';
import { useActiveWorkout } from '@/features/workouts/hooks/useActiveWorkout';
import {
  resolveActiveWorkoutEntry,
  resolveSwitchOutcome,
} from '@/features/workouts/utils/activeWorkoutEntry';
import { discardMessage } from '@/features/workouts/utils/discardMessage';
import { parseWorkoutAction, resolveDiscardLink } from '@/features/workouts/utils/workoutAction';
import { exerciseBlockLabels } from '@/features/routines/utils/exerciseBlockLabels';
import { SupersetHeader } from '@/features/routines/components/SupersetHeader';
import { Button } from '@/ui/Button';
import { Chip } from '@/ui/Chip';
import { StateView } from '@/ui/StateView';
import { confirmAction } from '@/lib/confirmAction';
import { formatDuration } from '@/lib/format';
import { isPermanentRejection } from '@/lib/http';
import { notify } from '@/lib/notify';
import { useElapsedSeconds } from '@/lib/useElapsedSeconds';
import { colors, commonStyles, createStyles, fonts, fontScaleCap, keyboardAppearance, layout, radii, spacing, typeScale, useTheme } from '@/ui/theme';
import { tickFeedback } from '@/features/workouts/liveRecords/tickFeedback';
import { haptics } from '@/ui/haptics';
import { CardHeader } from '@/ui/CardHeader';
import type { Exercise, ExerciseLastPerformance } from '@workout/domain';
import { syncWorkoutCompletionToAppleHealth } from '@/features/health/integrations/appleWorkoutIntegration';
import {
  addExerciseToWorkout,
  addSetToWorkoutExercise,
  adjustRest,
  applyLastPerformance,
  clearActiveWorkout,
  countWorkoutSets,
  setWorkoutSetType,
  getActiveWorkout,
  pauseWorkout,
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
  useTheme();
  const { t } = useTranslation();
  const { routineId, action, nextRoutineId, workoutId } = useLocalSearchParams<{
    routineId?: string;
    action?: string;
    /** With `action=switch`: the routine to start after this one (spec 0019). */
    nextRoutineId?: string;
    /** With `action=discard`: the workout the lock-screen status was for (spec 0035). */
    workoutId?: string;
  }>();
  const linkAction = parseWorkoutAction(action);
  // Set below, after the early returns; lets the link effects reach them.
  const finishRef = useRef<(() => Promise<boolean>) | null>(null);
  const switchRef = useRef<((nextId: string) => Promise<void>) | null>(null);
  const scrollRef = useRef<ComponentRef<typeof ScrollView>>(null);
  // For bringing the next set into view when a rest ends (spec 0018 FR-5).
  const contentRef = useRef<ComponentRef<typeof View>>(null);
  const setRowRefs = useRef(new Map<string, ComponentRef<typeof View>>());
  const viewportHeightRef = useRef(0);
  const workoutDraft = useActiveWorkout();
  const lastRestRef = useRef<RunningRest | undefined>(workoutDraft?.rest);
  // Set by a tick that starts no rest: bring the next set into view at once.
  const scrollAfterTickRef = useRef(false);
  // An active workout already on the device opens immediately, offline too.
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>(() =>
    resolveActiveWorkoutEntry(getActiveWorkout(), routineId) === 'resume'
      ? 'ready'
      : 'loading',
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isFinishing, setIsFinishing] = useState(false);
  const finishGuard = useRef(createWorkoutFinishGuard(() => getActiveWorkout()?.clientId)).current;
  const [finishError, setFinishError] = useState<string | null>(null);
  // The server refused the workout itself; retrying cannot help (EF-5).
  const [finishRefused, setFinishRefused] = useState(false);
  const [isPickerVisible, setIsPickerVisible] = useState(false);
  const replacement = useExerciseReplacement(workoutDraft);
  // The exercise whose rest is being changed (spec 0018 FR-2).
  const [restEditorFor, setRestEditorFor] = useState<string | null>(null);
  // The approach sets about to be added, shown before anything changes (spec
  // 0031 FR-1). Screen state only, so a restart reopens without it (EF-5).
  const [approachPreview, setApproachPreview] = useState<{
    workoutExerciseId: string;
    exerciseId: string;
  } | null>(null);
  const [typePicker, setTypePicker] = useState<{ exerciseId: string; setId: string } | null>(null);
  const [lastByExercise, setLastByExercise] = useState<
    Record<string, ExerciseLastPerformance | null>
  >({});
  const { settings } = useSettings();
  const { user } = useAuth();
  // Record badges and the notice while logging (spec 0032).
  const liveRecords = useLiveRecords(workoutDraft);
  /** The set whose tick on this screen just earned a record: its status area pops (spec 0034 FR-7). */
  const [recordPopSetId, setRecordPopSetId] = useState<string | null>(null);
  // The compact header (spec 0034 FR-21): shown past the header card's bottom.
  const [compactHeader, setCompactHeader] = useState(false);
  const compactHeaderRef = useRef(false);
  const headerBottomRef = useRef(0);
  const [stickyHeaderHeight, setStickyHeaderHeight] = useState(0);

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
    const clientId = workoutDraft.clientId;
    void confirmAction({
      title: t('workouts.finishTitle'),
      message: t('workouts.finishConfirm'),
      confirmLabel: t('workouts.finishWorkout'),
      cancelLabel: t('common.cancel'),
    }).then((confirmed) => {
      if (confirmed && getActiveWorkout()?.clientId === clientId) {
        void finishRef.current?.();
      }
    });
    // Runs once per link; the draft is read through the ref at confirm time.
  }, [linkAction, status, workoutDraft === null]);

  // Discarding loses every logged set, so it always asks first, naming the
  // sets done (spec 0035 FR-20). From a link it asks only for the workout the
  // link names, and confirming checks it is still the one in progress (EF-9).
  const discardWithConfirmation = async (clientId: string) => {
    const draft = getActiveWorkout();
    if (!draft || draft.clientId !== clientId) {
      notify(t('workouts.alreadyEnded'));
      return;
    }
    const confirmed = await confirmAction({
      title: t('workouts.discardTitle'),
      message: discardMessage(draft, t),
      confirmLabel: t('workouts.discardWorkout'),
      cancelLabel: t('common.cancel'),
      destructive: true,
    });
    if (!confirmed) {
      return;
    }
    if (getActiveWorkout()?.clientId !== clientId) {
      notify(t('workouts.alreadyEnded'));
      return;
    }
    clearActiveWorkout();
    router.replace('/routines');
  };

  // "Discard" on the lock-screen status opens this screen with action=discard
  // and the workout's identity: confirm in the app, never discard from the
  // link itself (FR-20). A stale link touches nothing (EF-6).
  useEffect(() => {
    if (linkAction !== 'discard' || status === 'loading') {
      return;
    }

    router.setParams({ action: undefined, workoutId: undefined });
    const draft = getActiveWorkout();
    if (resolveDiscardLink(draft?.clientId, workoutId) === 'ended' || !draft) {
      notify(t('workouts.alreadyEnded'));
      if (!draft) {
        router.replace('/routines');
      }
      return;
    }
    void discardWithConfirmation(draft.clientId);
    // Runs once per link, like the finish link above.
  }, [linkAction, status]);

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
          const current = getActiveWorkout();
          if (active && current?.clientId === workoutDraft?.clientId &&
              current?.exercises.some((item) => item.exerciseId === id && !item.warmUpMetadata)) {
            setActiveWorkout({ ...current, exercises: current.exercises.map((item) => item.exerciseId === id && !item.warmUpMetadata
              ? { ...item, warmUpMetadata: warmUpMetadataOf(exercise) } : item) });
          }
        })
        .catch(() => undefined);
    }

    return () => {
      active = false;
    };
  }, [exerciseIdsKey, workoutDraft?.clientId]);

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

  // "Last time" pairs by kind and position within the kind (spec 0031), so a
  // set whose type changes, or sets added or removed ahead of it, re-pair.
  // applyLastPerformance returns the same draft when nothing changes, so this
  // settles after one pass.
  useEffect(() => {
    if (!workoutDraft) {
      return;
    }

    let next = workoutDraft;
    for (const [id, performance] of Object.entries(lastByExercise)) {
      if (performance) {
        next = applyLastPerformance(next, id, performance);
      }
    }

    if (next !== workoutDraft) {
      setActiveWorkout(next);
    }
  }, [workoutDraft, lastByExercise]);

  /**
   * Brings a set's row to about a third of the screen (spec 0018 FR-5) — below
   * the compact header when it shows (spec 0034 FR-21). After the next frame,
   * so a rest bar that just went away has left the viewport final.
   */
  const scrollToSet = (workoutSetId: string) => {
    requestAnimationFrame(() => {
      const row = setRowRefs.current.get(workoutSetId);
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
  };

  // The compact header shows once the full header card has scrolled out of
  // view (spec 0034 FR-21). State changes only when the threshold is crossed,
  // so scrolling does not re-render the list.
  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const show =
      headerBottomRef.current > 0 && event.nativeEvent.contentOffset.y > headerBottomRef.current;
    if (show !== compactHeaderRef.current) {
      compactHeaderRef.current = show;
      setCompactHeader(show);
    }
  };

  // A rest that ended or was skipped while this screen is open, or a tick that
  // started no rest (spec 0029 FR-8), brings the next set to do to about a
  // third of the screen (FR-5). A new rest replacing a running one, a finish
  // or a discard do not scroll.
  useEffect(() => {
    const previous = lastRestRef.current;
    lastRestRef.current = workoutDraft?.rest;
    const afterTick = scrollAfterTickRef.current;
    scrollAfterTickRef.current = false;
    if (!workoutDraft || workoutDraft.rest || (!previous && !afterTick)) {
      return;
    }

    const target = currentSetToDo(workoutDraft);
    if (target) {
      scrollToSet(target.workoutSetId);
    }
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
  const finishWorkout = (nextId?: string) => finishGuard.save(workoutDraft.clientId, async () => {
    if (countWorkoutSets(workoutDraft).done === 0) {
      setFinishError(t('workouts.markOneSet'));
      return false;
    }

    try {
      setIsFinishing(true);
      setFinishError(null);
      setFinishRefused(false);

      await workoutsClient.create(toCreateWorkoutSessionInput(workoutDraft));

      // A delayed save must never clear or navigate away from a replacement workout.
      if (getActiveWorkout()?.clientId !== workoutDraft.clientId) return false;
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
      if (getActiveWorkout()?.clientId !== workoutDraft.clientId) return false;
      setFinishError(
        error instanceof Error ? error.message : t('workouts.saveError'),
      );
      setFinishRefused(isPermanentRejection(error));
      return false;
    } finally {
      setIsFinishing(false);
    }
  });

  finishRef.current = () => finishWorkout();

  const handleTopFinish = async () => {
    const clientId = workoutDraft.clientId;
    if (countWorkoutSets(workoutDraft).done === 0) {
      setFinishError(t('workouts.markOneSet'));
      return;
    }
    await finishGuard.confirm(clientId, () => confirmAction({
      title: t('workouts.finishTitle'),
      message: t('workouts.finishConfirm'),
      confirmLabel: t('workouts.finishWorkout'),
      cancelLabel: t('common.cancel'),
    }), async () => finishRef.current?.());
  };

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
    const workoutDraft = getActiveWorkout();
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
    // default (FR-1); in a superset only a tick that completes the round rests
    // (spec 0029) — the same rule as a tick from the watch (spec 0025).
    // Undo selects the exact set and cancels only its own originating rest.
    const nextDraft = becomingDone
      ? completeSetInRounds(
          workoutDraft,
          workoutExerciseId,
          workoutSetId,
          settings.defaultRestSeconds,
        )
      : toggleWorkoutSetDone(workoutDraft, workoutExerciseId, workoutSetId);
    // One pulse per tick: the record pattern replaces the tap (spec 0034 FR-4).
    const feedback = tickFeedback(workoutDraft, nextDraft, workoutSetId);
    if (feedback === 'record') {
      haptics.record();
      setRecordPopSetId(workoutSetId);
    } else if (feedback === 'setDone') {
      haptics.setDone();
    }
    scrollAfterTickRef.current =
      becomingDone && (!nextDraft.rest || nextDraft.rest === workoutDraft.rest);
    setActiveWorkout(nextDraft);
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

  // The warm-up action as a toggle (spec 0031): remove the generated sets at
  // once, or preview the ramp and add it on confirm.
  const handleWarmUpAction = (workoutExerciseId: string) => {
    const exercise = workoutDraft.exercises.find((item) => item.id === workoutExerciseId);
    if (exercise && warmUpActionFor(exercise) === 'remove') {

      applyDraft(removeGeneratedWarmUps(workoutDraft, workoutExerciseId));
      return;
    }

    if (exercise) {

      setApproachPreview({ workoutExerciseId, exerciseId: exercise.exerciseId });
    }
  };

  const confirmApproachPreview = (preview: ApproachSetsPreview) => {
    const current = getActiveWorkout();
    if (current && current.clientId === workoutDraft.clientId && approachPreview) {
      setActiveWorkout(confirmApproachSets(current, approachPreview.workoutExerciseId, preview));
    }
    setApproachPreview(null);
  };

  const previewedExercise = approachPreview
    ? workoutDraft.exercises.find((item) => item.id === approachPreview.workoutExerciseId && item.exerciseId === approachPreview.exerciseId)
    : undefined;
  const typePickerSet = typePicker ? workoutDraft.exercises.find((item) => item.id === typePicker.exerciseId)?.entries.find((set) => set.id === typePicker.setId) : undefined;

  const handleAddExercise = (exercise: Exercise) => {
    if (!workoutDraft) {
      return;
    }

    applyDraft(
      addExerciseToWorkout(workoutDraft, {
        ...exercise,
      }),
    );
  };

  const handleRemoveExercise = (workoutExerciseId: string) => {
    if (!workoutDraft) {
      return;
    }

    applyDraft(removeWorkoutExerciseInGroups(workoutDraft, workoutExerciseId));
  };

  const handleMoveExercise = (
    workoutExerciseId: string,
    direction: 'up' | 'down',
  ) => {
    if (!workoutDraft) {
      return;
    }

    applyDraft(
      moveWorkoutExerciseInGroups(workoutDraft, workoutExerciseId, direction),
    );
  };

  const handleSelectSetType = (workoutExerciseId: string, workoutSetId: string) => {
    setTypePicker({ exerciseId: workoutExerciseId, setId: workoutSetId });
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
    // Removing a set has no dialog: the tap is the confirmation (spec 0034 FR-4).
    haptics.destructiveConfirm();
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

  const handleDiscard = () => discardWithConfirmation(workoutDraft.clientId);

  const restEditorExercise = restEditorFor
    ? workoutDraft.exercises.find((exercise) => exercise.id === restEditorFor)
    : undefined;

  const setProgress = countWorkoutSets(workoutDraft);
  const unit = workoutDraft.unit ?? 'kg';
  const isPaused = Boolean(workoutDraft.pausedAt);
  const blockLabels = exerciseBlockLabels(workoutDraft.exercises);
  // The set to do now: its status area says so, and the rest bar names it
  // (spec 0029, spec 0034 FR-20).
  const upNext = currentSetToDo(workoutDraft);
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
        <CardHeader
          title={exercise.exerciseName}
          leading={
            <>
              <View style={[styles.blockBadge, inSuperset ? styles.blockBadgeSuperset : null]}>
                <Text style={[styles.blockBadgeText, inSuperset ? styles.blockBadgeTextSuperset : null]}>
                  {label.label}
                </Text>
              </View>
              {imageByExercise[exercise.exerciseId] ? (
                <ExerciseThumb imageUrl={imageByExercise[exercise.exerciseId]} size={40} />
              ) : null}
            </>
          }
          trailing={
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
          }
        >
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
          <ComparisonStatus draft={workoutDraft} exerciseId={exercise.exerciseId} states={liveRecords.states} retry={liveRecords.retry} />
          <ComparisonBadge hits={liveRecords.feedback.byExercise[exercise.exerciseId]} unit={unit} />
        </CardHeader>
        <View style={[styles.setList, inSuperset ? styles.indented : null]}>
          <WorkoutSetHeader
            trackingType={exercise.trackingType}
            unilateral={exercise.isUnilateral}
            unit={unit}
          />
          {exercise.entries.map((set) => {
            // In a superset each working set shows its round on the rail (FR-14).
            const round = inSuperset ? roundIndexOf(exercise, set.id) : -1;
            return (
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
              {round >= 0 ? (
                <View pointerEvents="none" style={styles.roundTagSlot}>
                  <View style={styles.roundTag}>
                    <Text style={styles.roundTagText}>
                      {t('supersets.roundTag', { round: round + 1 })}
                    </Text>
                  </View>
                </View>
              ) : null}
              <WorkoutSetRow
                set={set}
                setNumber={setNumberOf(exercise.entries, set.id)?.number ?? set.order}
                trackingType={exercise.trackingType}
                unilateral={exercise.isUnilateral}
                unit={unit}
                previousLabel={previousSetLabel(
                  // Paired by kind, as the placeholders (spec 0031 FR-18).
                  pairedPerformance(lastByExercise[exercise.exerciseId], exercise.entries),
                  set.order,
                  exercise.trackingType,
                  unit,
                )}
                // One status per set, in the row (spec 0034 FR-19, FR-20).
                isUpNext={upNext?.workoutSetId === set.id}
                recordHits={liveRecords.badges.bySet[set.id]}
                comparisonHits={liveRecords.feedback.bySet[set.id]}
                recordPop={recordPopSetId === set.id}
                onChange={(field, value) => handleSetChange(exercise.id, set.id, field, value)}
                onSelectType={() => handleSelectSetType(exercise.id, set.id)}
                onToggleDone={() => handleToggleDone(exercise.id, set.id)}
                onRemove={() => handleRemoveSet(exercise.id, set.id)}
              />
            </View>
            );
          })}
          <View style={styles.cardActions}>
            <Button
              label={t('workouts.addSet')}
              icon="add"
              variant="ghost"
              onPress={() => handleAddSet(exercise.id)}
              style={styles.compactButton}
            />
            {canAddApproachSets(exercise) ? (
              <WarmUpActionButton
                action={warmUpActionFor(exercise)}
                onPress={() => handleWarmUpAction(exercise.id)}
                style={styles.iconButton}
              />
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
        </View>
      </View>
    );
  };

  return (
    <View style={styles.screen}>
      <View style={styles.finishHeader}>
        <Button
          label={isFinishing ? t('workouts.savingWorkout') : t('workouts.finishWorkout')}
          icon="flag"
          variant="secondary"
          onPress={() => void handleTopFinish()}
          disabled={isFinishing}
          fullWidth
        />
        {finishError ? <Text accessibilityRole="alert" style={styles.errorText}>{finishError}</Text> : null}
        {finishRefused ? (
          <>
            <Text style={styles.meta}>{t('workouts.saveRefusedHint')}</Text>
            <Button label={t('workouts.discardWorkout')} variant="ghost" destructive
              onPress={() => void handleDiscard()} disabled={isFinishing} />
          </>
        ) : null}
      </View>
      <View style={styles.workoutBody}>
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
        onScroll={onScroll}
        scrollEventThrottle={16}
      >
        <View ref={contentRef} collapsable={false} style={styles.content}>
          <View
            style={styles.headerCard}
            onLayout={(event) => {
              const { y, height } = event.nativeEvent.layout;
              // Its bottom in the list: the list's top padding, then the card.
              headerBottomRef.current = spacing.lg + y + height;
            }}
          >
            <View style={styles.liveRow}>
              <View style={[styles.liveDot, isPaused ? styles.liveDotPaused : null]} />
              <Text style={styles.sectionLabel}>
                {isPaused ? t('workouts.paused') : t('routines.activeLabel')}
              </Text>
            </View>
            <Text style={styles.routineName}>{workoutDraft.routineName}</Text>
            <View style={styles.clockRow}>
              {/* The clock and its button share one row (spec 0034 FR-18 caps). */}
              <Text
                maxFontSizeMultiplier={fontScaleCap.largeFigure}
                style={[styles.clock, isPaused ? styles.clockPaused : null]}
              >
                {formatDuration(elapsedSeconds)}
              </Text>
              <Button
                label={isPaused ? t('workouts.resume') : t('workouts.pause')}
                icon={isPaused ? 'play' : 'pause'}
                variant="secondary"
                onPress={handleTogglePause}
                maxFontScale={fontScaleCap.fixedColumn}
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
                <SupersetHeader
                  size={members.length}
                  round={roundStatus(
                    members.flatMap((index) => workoutDraft.exercises[index] ?? []),
                  )}
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
            keyboardAppearance={keyboardAppearance()}
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
      <StickyWorkoutHeader
        visible={compactHeader}
        clock={formatDuration(elapsedSeconds)}
        paused={isPaused}
        model={stickyHeaderModel(workoutDraft)}
        unit={unit}
        onPressUpNext={scrollToSet}
        onLayout={(event) => setStickyHeaderHeight(event.nativeEvent.layout.height)}
      />
      </View>
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
          next={nextSetLabel(workoutDraft, t)}
        />
      ) : null}
      <ApproachSetsPreviewSheet
        target={approachPreview && previewedExercise ? {
          key: `${workoutDraft.clientId}:${previewedExercise.id}`,
          exerciseId: previewedExercise.exerciseId, exerciseName: previewedExercise.exerciseName,
          metadata: previewedExercise.warmUpMetadata, unit,
          preceding: precedingWorkoutWarmUpMetadata(workoutDraft, previewedExercise.id),
          seed: workoutDraft.warmUpPreferences?.[previewedExercise.exerciseId],
        } : null}
        buildPreview={(context) => previewApproachSets(workoutDraft, previewedExercise?.id ?? '', context)}
        onSnapshot={(snapshot) => {
          const current = getActiveWorkout();
          if (!current || current.clientId !== workoutDraft.clientId || !previewedExercise ||
              !current.exercises.some((item) => item.id === previewedExercise.id && item.exerciseId === previewedExercise.exerciseId)) return;
          if (JSON.stringify(current.warmUpPreferences?.[previewedExercise.exerciseId]) === JSON.stringify(snapshot)) return;
          setActiveWorkout({ ...current, warmUpPreferences: { ...current.warmUpPreferences, [previewedExercise.exerciseId]: snapshot } });
        }}
        onMetadata={(metadata) => {
          const current = getActiveWorkout();
          if (!current || current.clientId !== workoutDraft.clientId || !previewedExercise) return;
          setActiveWorkout({ ...current, exercises: current.exercises.map((item) => item.id === previewedExercise.id && item.exerciseId === previewedExercise.exerciseId
            ? { ...item, warmUpMetadata: metadata } : item) });
        }}
        onConfirm={confirmApproachPreview}
        onCancel={() => setApproachPreview(null)}
      />
      <SetTypeSheet selection={typePickerSet ? { type: typePickerSet.type } : null}
        onClose={() => setTypePicker(null)} onSelect={(type) => {
          const current = getActiveWorkout();
          if (current && current.clientId === workoutDraft.clientId && typePicker) {
            setActiveWorkout(setWorkoutSetType(current, typePicker.exerciseId, typePicker.setId, type));
          }
        }} />
      <RecordNotice
        notice={liveRecords.notice}
        unit={unit}
        // Below the compact header while it shows (spec 0034 FR-21).
        top={compactHeader ? stickyHeaderHeight + spacing.md : undefined}
      />
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

const styles = createStyles(() => ({
  finishHeader: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
    backgroundColor: colors.surface,
    gap: spacing.xs,
  },
  workoutBody: { flex: 1 },
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
    ...typeScale.caption,
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
    borderRadius: radii.pill,
    backgroundColor: colors.primaryInk,
  },
  liveDotPaused: {
    backgroundColor: colors.textMuted,
  },
  routineName: {
    ...commonStyles.cardTitle,
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
    color: colors.primaryInk,
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
  },
  energyUnit: {
    color: colors.textMuted,
    ...typeScale.caption,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  progressCount: {
    color: colors.primaryInk,
    fontFamily: fonts.displayBold,
    ...typeScale.body,
    fontVariant: ['tabular-nums'],
  },
  progressTrack: {
    height: 8,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceRaised,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: radii.pill,
    backgroundColor: colors.primaryInk,
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
    borderRadius: radii.pill,
    backgroundColor: colors.borderStrong,
  },
  supersetMembers: {
    gap: spacing.lg,
  },
  indented: {
    marginLeft: layout.setMarker,
  },
  // Centred on the superset rail, in the gutter left of the set rows.
  roundTagSlot: {
    position: 'absolute',
    left: -layout.setMarker,
    width: 28,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roundTag: {
    minWidth: 24,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.xxs,
    paddingVertical: spacing.xxs,
    alignItems: 'center',
  },
  roundTagText: {
    color: colors.textMuted,
    fontFamily: fonts.displayBold,
    ...typeScale.caption,
  },
  exercise: {
    gap: spacing.sm,
  },
  blockBadge: {
    minWidth: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceRaised,
    paddingHorizontal: spacing.xs,
  },
  blockBadgeSuperset: {
    borderRadius: radii.round,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.textMuted,
  },
  blockBadgeText: {
    color: colors.text,
    fontFamily: fonts.displayBold,
    ...typeScale.caption,
  },
  blockBadgeTextSuperset: {
    color: colors.text,
    ...typeScale.caption,
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
    ...typeScale.body,
    minHeight: 72,
    // Long notes scroll inside the field, which keeps the caret in view.
    maxHeight: 160,
    textAlignVertical: 'top',
  },
  errorText: {
    ...commonStyles.error,
  },
}));
