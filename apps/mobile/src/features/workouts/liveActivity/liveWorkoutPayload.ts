import type { HealthWorkoutPayload, LiveWorkoutState } from '@workout/domain';

import { currentSetToDo } from '@/features/workouts/restTimer/nextSetToDo';
import {
  countWorkoutSets,
  type WorkoutSessionDraft,
} from '@/features/workouts/state/workoutDraftStore';
import { roundIndexOf, supersetAround } from '@/features/workouts/superset/rounds';
import { setTarget } from '@/features/workouts/watch/watchProtocol';

/**
 * The up-next set as the status shows it (spec 0035 FR-14): "Bench press ·
 * 100 kg × 8", with the round inside a superset ("· Round 2"). The draft's
 * strings are already in the workout's display unit. Null when every set is
 * done.
 */
export function liveUpNext(
  draft: WorkoutSessionDraft,
  roundLabel: (round: number) => string,
): string | null {
  const target = currentSetToDo(draft);
  const index = target
    ? draft.exercises.findIndex((item) => item.id === target.workoutExerciseId)
    : -1;
  const exercise = draft.exercises[index];
  const set = exercise?.entries.find((item) => item.id === target?.workoutSetId);
  if (!exercise || !set) {
    return null;
  }
  const parts = [
    exercise.exerciseName,
    setTarget(set, draft.unit ?? 'kg', exercise.trackingType, exercise.isUnilateral),
  ];
  const round = supersetAround(draft.exercises, index) ? roundIndexOf(exercise, set.id) : -1;
  if (round >= 0) {
    parts.push(roundLabel(round + 1));
  }
  return parts.filter(Boolean).join(' · ');
}

/**
 * The live surface is keyed by the workout identity (spec 0014), which is
 * unique per workout; the draft `id` repeats for the same routine.
 */
export function toLiveWorkoutPayload(
  draft: WorkoutSessionDraft,
  activeEnergyKcal: number | null,
  upNext: (draft: WorkoutSessionDraft) => string | null = () => null,
): HealthWorkoutPayload {
  const sets = countWorkoutSets(draft);
  return {
    workoutSessionId: draft.clientId,
    routineId: draft.routineId,
    routineName: draft.routineName,
    startedAt: draft.startedAt,
    exerciseCount: draft.exercises.length,
    pausedAt: draft.pausedAt,
    pausedSeconds: draft.pausedSeconds ?? 0,
    activeEnergyKcal,
    restEndsAt: draft.rest?.endsAt,
    upNext: upNext(draft),
    setsDone: sets.done,
    setsTotal: sets.total,
  };
}

/**
 * Whether the surface already shows the workout's progress: the up-next set
 * and the sets-done count (spec 0035 FR-17).
 */
export function sameProgress(
  left: Pick<HealthWorkoutPayload, 'upNext' | 'setsDone' | 'setsTotal'> | null,
  right: Pick<HealthWorkoutPayload, 'upNext' | 'setsDone' | 'setsTotal'>,
) {
  return (
    left !== null &&
    (left.upNext ?? null) === (right.upNext ?? null) &&
    left.setsDone === right.setsDone &&
    left.setsTotal === right.setsTotal
  );
}

/** Whether the surface already shows the draft's running rest (spec 0018). */
export function sameRest(
  draft: Pick<WorkoutSessionDraft, 'rest'>,
  shownRestEndsAt: string | undefined,
) {
  return draft.rest?.endsAt === shownRestEndsAt;
}

/** Seconds of drift tolerated between the draft and the surface's pause total. */
const PAUSE_TOLERANCE_SECONDS = 2;

export function samePause(
  draft: Pick<WorkoutSessionDraft, 'pausedAt' | 'pausedSeconds'>,
  state: Pick<LiveWorkoutState, 'pausedAt' | 'pausedSeconds'>,
) {
  return (
    Boolean(draft.pausedAt) === Boolean(state.pausedAt) &&
    Math.abs((draft.pausedSeconds ?? 0) - state.pausedSeconds) <=
      PAUSE_TOLERANCE_SECONDS
  );
}

export type ReconcileAction =
  | { kind: 'none' }
  | { kind: 'end' }
  | { kind: 'start' }
  | { kind: 'adoptPause'; pausedAt?: string; pausedSeconds: number };

/**
 * What to do so the surface and the active workout agree, run on mount and
 * whenever the app becomes active:
 * - a surface with no workout behind it is ended (EF-3);
 * - a workout with no surface, or with another workout's, starts one (EF-8:
 *   the system ends activities after hours);
 * - a pause state that differs is adopted from the surface. Every in-app change
 *   is pushed at once, so a difference can only be a lock-screen action the
 *   app missed — the most recent one (EF-4).
 */
export function reconcile(
  draft: Pick<WorkoutSessionDraft, 'clientId' | 'pausedAt' | 'pausedSeconds'> | null,
  state: LiveWorkoutState | null,
): ReconcileAction {
  if (!draft) {
    return state ? { kind: 'end' } : { kind: 'none' };
  }

  if (!state || state.workoutSessionId !== draft.clientId) {
    return { kind: 'start' };
  }

  if (!samePause(draft, state)) {
    return {
      kind: 'adoptPause',
      pausedAt: state.pausedAt,
      pausedSeconds: state.pausedSeconds,
    };
  }

  return { kind: 'none' };
}
