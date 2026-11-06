import type {
  ExerciseTrackingType,
  WatchWorkoutEvent,
  WatchWorkoutSnapshot,
} from '@workout/domain';

import { currentSetToDo } from '@/features/workouts/restTimer/nextSetToDo';
import { completeSetInRounds, restAfterTick } from '@/features/workouts/superset/rounds';
import {
  effectiveSetValue,
  effectiveSideReps,
  pauseWorkout,
  resumeWorkout,
  skipRest,
  updateWorkoutSetDraft,
  type RunningRest,
  type WorkoutSetDraft,
  type WorkoutSessionDraft,
} from '@/features/workouts/state/workoutDraftStore';
import { countWorkoutSets } from '@/features/workouts/state/workoutDraftStore';
import { trackingFields } from '@/lib/tracking';
import { setNumberOf } from '@/features/workouts/utils/setNumber';

/**
 * The set the watch offers to tick (spec 0025 FR-4): the same set the phone
 * shows as next, in superset round order (spec 0029 FR-11).
 */
export { currentSetToDo };

/**
 * The planned values as the phone shows them, e.g. "60 kg × 8", "0:45" or
 * "500 m 1:45", following the exercise's tracking type (spec 0021); a
 * unilateral exercise's reps read "× 10/8", left then right (spec 0022). The
 * draft's strings are already in the workout's display unit, so nothing is
 * converted (constitution Art. 4).
 */
export function setTarget(
  set: WorkoutSetDraft,
  unit: string,
  trackingType?: ExerciseTrackingType,
  isUnilateral = false,
): string {
  const parts = trackingFields(trackingType).map((field) => {
    switch (field) {
      case 'weight': {
        const weight = effectiveSetValue(set.weightKg, set.weightPlaceholder);
        return weight ? `${weight} ${unit}` : '';
      }
      case 'reps': {
        if (isUnilateral) {
          const left = effectiveSideReps(set, 'left');
          const right = effectiveSideReps(set, 'right');
          return left || right ? `× ${left || '–'}/${right || '–'}` : '';
        }
        const reps = effectiveSetValue(set.reps, set.repsPlaceholder);
        return reps ? `× ${reps}` : '';
      }
      case 'distance': {
        const distance = effectiveSetValue(set.distance ?? '', set.distancePlaceholder);
        return distance ? `${distance} m` : '';
      }
      case 'duration':
        return effectiveSetValue(set.duration ?? '', set.durationPlaceholder);
    }
  });
  return parts.filter(Boolean).join(' ');
}

/** Most reps the watch's control reaches (spec 0041 FR-11). */
export const WATCH_MAX_REPS = 100;

/**
 * The reps control of the set to do (spec 0041 FR-10, FR-13): the planned
 * reps (typed, else ghosted; 0 when none) and the other planned values beside
 * them. Absent for a set that records no reps or records them per side.
 */
export function watchRepsControl(
  set: WorkoutSetDraft,
  unit: string,
  trackingType?: ExerciseTrackingType,
  isUnilateral = false,
): { reps: number; load: string } | null {
  const fields = trackingFields(trackingType);
  if (isUnilateral || !fields.includes('reps')) {
    return null;
  }
  const planned = Number.parseInt(effectiveSetValue(set.reps, set.repsPlaceholder), 10);
  const reps = Number.isFinite(planned) ? Math.min(Math.max(planned, 0), WATCH_MAX_REPS) : 0;
  const weight = fields.includes('weight') ? effectiveSetValue(set.weightKg, set.weightPlaceholder) : '';
  return { reps, load: weight ? `${weight} ${unit}` : '' };
}

/** What the watch shows of the active workout (spec 0025). */
export function toWatchSnapshot(
  draft: WorkoutSessionDraft,
  defaultRestSeconds: number,
): WatchWorkoutSnapshot {
  const target = currentSetToDo(draft);
  const exercise = target
    ? draft.exercises.find((item) => item.id === target.workoutExerciseId)
    : undefined;
  const set = exercise?.entries.find((item) => item.id === target?.workoutSetId);
  // Counted as the phone's row counts them (spec 0040 FR-1).
  const numbered = exercise && set ? setNumberOf(exercise.entries, set.id) : null;

  return {
    workoutSessionId: draft.clientId,
    routineName: draft.routineName,
    startedAt: draft.startedAt,
    pausedAt: draft.pausedAt,
    pausedSeconds: draft.pausedSeconds ?? 0,
    restEndsAt: draft.rest?.endsAt,
    restId: draft.rest?.id,
    restSkipVersion: 1,
    canSkipRest: !!draft.rest?.id && !draft.pausedAt,
    lastProcessedSkipId: draft.lastProcessedWatchSkipId,
    setsDone: countWorkoutSets(draft).done,
    currentSet:
      exercise && set
        ? {
            workoutExerciseId: exercise.id,
            workoutSetId: set.id,
            exerciseName: exercise.exerciseName,
            setNumber: numbered?.number ?? 1,
            setCount: numbered?.count ?? exercise.entries.length,
            isWarmup: numbered?.isWarmup ?? false,
            target: setTarget(
              set,
              draft.unit ?? 'kg',
              exercise.trackingType,
              exercise.isUnilateral,
            ),
            // 0 for a set that does not finish its superset round (spec 0029).
            restSeconds: restAfterTick(draft, exercise.id, set.id, defaultRestSeconds),
            ...(watchRepsControl(set, draft.unit ?? 'kg', exercise.trackingType, exercise.isUnilateral) ?? {}),
          }
        : undefined,
  };
}

/** Whether two snapshots show the same thing; avoids sending a repeat. */
export function sameSnapshot(left: WatchWorkoutSnapshot, right: WatchWorkoutSnapshot) {
  return JSON.stringify(left) === JSON.stringify(right);
}

/**
 * When a rest started. Estimated from its end and length, which is exact
 * until extra time is added or taken away (spec 0029 plan, Risks).
 */
function restStartedMs(rest: RunningRest): number {
  return Date.parse(rest.endsAt) - rest.totalSeconds * 1000;
}

function isSetDone(draft: WorkoutSessionDraft, workoutExerciseId: string, workoutSetId: string) {
  return (
    draft.exercises
      .find((exercise) => exercise.id === workoutExerciseId)
      ?.entries.find((set) => set.id === workoutSetId)?.done ?? true
  );
}

/**
 * Applies a request from the watch to the active workout (spec 0025). Events
 * for another workout, and those that change nothing on the draft
 * (`finishRequested`, `activeEnergy`), return the draft as it is.
 *
 * A tick follows the superset rules of the phone (spec 0029 FR-11) and starts
 * its rest from the instant it was made on the watch, so one delivered late
 * may start a rest that is already over (spec 0018's runner then clears it
 * without an alert); it never replaces a rest that ends later, and a tick
 * that ends the rest mid-round (FR-4) never ends one started after it (EF-6).
 */
export function applyWatchEvent(
  draft: WorkoutSessionDraft,
  event: WatchWorkoutEvent,
  defaultRestSeconds: number,
): WorkoutSessionDraft {
  if (event.workoutSessionId !== draft.clientId) {
    return draft;
  }

  switch (event.kind) {
    case 'setDone': {
      // Reps chosen on the watch are stored as if typed on the phone (spec
      // 0041 FR-12); 0 leaves the set without reps (EF-1).
      const withReps =
        event.reps !== undefined && !isSetDone(draft, event.workoutExerciseId, event.workoutSetId)
          ? updateWorkoutSetDraft(
              draft,
              event.workoutExerciseId,
              event.workoutSetId,
              'reps',
              event.reps > 0 ? String(Math.round(event.reps)) : '',
            )
          : draft;
      const completed = completeSetInRounds(
        withReps,
        event.workoutExerciseId,
        event.workoutSetId,
        defaultRestSeconds,
        new Date(event.at),
        event.id,
      );
      const next = completed.rest?.id === event.id && draft.watchSkippedRestIds?.includes(event.id)
        ? skipRest(completed) : completed;
      const running = draft.rest;
      const keepRest =
        next !== draft &&
        running !== undefined &&
        (next.rest
          ? Date.parse(running.endsAt) > Date.parse(next.rest.endsAt)
          : restStartedMs(running) > Date.parse(event.at));
      if (next === withReps) {
        // Nothing was ticked (already done or not found): nothing changes.
        return draft;
      }
      return keepRest ? { ...next, rest: running } : next;
    }
    case 'skipRest': {
      const matches = !draft.pausedAt && draft.rest?.id === event.restId && Date.parse(draft.rest.endsAt) > Date.now();
      const next = matches ? skipRest(draft) : draft;
      const remember = !draft.pausedAt && !draft.watchSkippedRestIds?.includes(event.restId);
      if (!remember && next.lastProcessedWatchSkipId === event.id) return next;
      return { ...next, lastProcessedWatchSkipId: event.id,
        watchSkippedRestIds: remember ? [...(draft.watchSkippedRestIds ?? []), event.restId].slice(-200) : draft.watchSkippedRestIds };
    }
    case 'pause':
      return pauseWorkout(draft, new Date(event.at));
    case 'resume':
      return resumeWorkout(draft, new Date(event.at));
    default:
      return draft;
  }
}
