import type {
  ExerciseTrackingType,
  WatchWorkoutEvent,
  WatchWorkoutSnapshot,
} from '@workout/domain';

import { nextSetToDo, type SetToDo } from '@/features/workouts/restTimer/nextSetToDo';
import {
  completeSet,
  effectiveSetValue,
  pauseWorkout,
  resolveRestSeconds,
  resumeWorkout,
  type WorkoutSetDraft,
  type WorkoutSessionDraft,
} from '@/features/workouts/state/workoutDraftStore';
import { trackingFields } from '@/lib/tracking';

/**
 * The set the watch offers to tick (spec 0025 FR-4). During a rest, the set
 * after it (spec 0018's order, supersets alternating); otherwise the next set
 * of the first exercise block with one left. Null when every set is done.
 */
export function currentSetToDo(draft: WorkoutSessionDraft): SetToDo | null {
  if (draft.rest) {
    return nextSetToDo(draft, draft.rest.workoutExerciseId);
  }

  const first = draft.exercises.find((exercise) => exercise.entries.some((set) => !set.done));
  return first ? nextSetToDo(draft, first.id) : null;
}

/**
 * The planned values as the phone shows them, e.g. "60 kg × 8", "0:45" or
 * "500 m 1:45", following the exercise's tracking type (spec 0021). The
 * draft's strings are already in the workout's display unit, so nothing is
 * converted (constitution Art. 4).
 */
export function setTarget(
  set: WorkoutSetDraft,
  unit: string,
  trackingType?: ExerciseTrackingType,
): string {
  const parts = trackingFields(trackingType).map((field) => {
    switch (field) {
      case 'weight': {
        const weight = effectiveSetValue(set.weightKg, set.weightPlaceholder);
        return weight ? `${weight} ${unit}` : '';
      }
      case 'reps': {
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
            target: setTarget(set, draft.unit ?? 'kg', exercise.trackingType),
            restSeconds: resolveRestSeconds(exercise, defaultRestSeconds),
          }
        : undefined,
  };
}

/** Whether two snapshots show the same thing; avoids sending a repeat. */
export function sameSnapshot(left: WatchWorkoutSnapshot, right: WatchWorkoutSnapshot) {
  return JSON.stringify(left) === JSON.stringify(right);
}

/**
 * Applies a request from the watch to the active workout (spec 0025). Events
 * for another workout, and those that change nothing on the draft
 * (`finishRequested`, `activeEnergy`), return the draft as it is.
 *
 * A tick starts its rest from the instant it was made on the watch, so one
 * delivered late may start a rest that is already over (spec 0018's runner
 * then clears it without an alert); it never replaces a rest that ends later.
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
      const next = completeSet(
        draft,
        event.workoutExerciseId,
        event.workoutSetId,
        defaultRestSeconds,
        new Date(event.at),
      );
      const keepRest =
        next !== draft &&
        draft.rest &&
        (!next.rest || Date.parse(draft.rest.endsAt) > Date.parse(next.rest.endsAt));
      return keepRest ? { ...next, rest: draft.rest } : next;
    }
    case 'pause':
      return pauseWorkout(draft, new Date(event.at));
    case 'resume':
      return resumeWorkout(draft, new Date(event.at));
    default:
      return draft;
  }
}
