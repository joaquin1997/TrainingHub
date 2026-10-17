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
  type RunningRest,
  type WorkoutSetDraft,
  type WorkoutSessionDraft,
} from '@/features/workouts/state/workoutDraftStore';
import { trackingFields } from '@/lib/tracking';

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

/** What the watch shows of the active workout (spec 0025). */
export function toWatchSnapshot(
  draft: WorkoutSessionDraft,
  defaultRestSeconds: number,
): WatchWorkoutSnapshot {
  const target = currentSetToDo(draft);
  const exercise = target
    ? draft.exercises.find((item) => item.id === target.workoutExerciseId)
    : undefined;
  const setIndex = exercise?.entries.findIndex((set) => set.id === target?.workoutSetId) ?? -1;
  const set = exercise?.entries[setIndex];

  return {
    workoutSessionId: draft.clientId,
    routineName: draft.routineName,
    startedAt: draft.startedAt,
    pausedAt: draft.pausedAt,
    pausedSeconds: draft.pausedSeconds ?? 0,
    restEndsAt: draft.rest?.endsAt,
    currentSet:
      exercise && set
        ? {
            workoutExerciseId: exercise.id,
            workoutSetId: set.id,
            exerciseName: exercise.exerciseName,
            setNumber: setIndex + 1,
            setCount: exercise.entries.length,
            target: setTarget(
              set,
              draft.unit ?? 'kg',
              exercise.trackingType,
              exercise.isUnilateral,
            ),
            // 0 for a set that does not finish its superset round (spec 0029).
            restSeconds: restAfterTick(draft, exercise.id, set.id, defaultRestSeconds),
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
      const next = completeSetInRounds(
        draft,
        event.workoutExerciseId,
        event.workoutSetId,
        defaultRestSeconds,
        new Date(event.at),
      );
      const running = draft.rest;
      const keepRest =
        next !== draft &&
        running !== undefined &&
        (next.rest
          ? Date.parse(running.endsAt) > Date.parse(next.rest.endsAt)
          : restStartedMs(running) > Date.parse(event.at));
      return keepRest ? { ...next, rest: running } : next;
    }
    case 'pause':
      return pauseWorkout(draft, new Date(event.at));
    case 'resume':
      return resumeWorkout(draft, new Date(event.at));
    default:
      return draft;
  }
}
