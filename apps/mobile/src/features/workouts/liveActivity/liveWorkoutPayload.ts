import type { HealthWorkoutPayload, LiveWorkoutState } from '@workout/domain';

import type { WorkoutSessionDraft } from '@/features/workouts/state/workoutDraftStore';

/**
 * The live surface is keyed by the workout identity (spec 0014), which is
 * unique per workout; the draft `id` repeats for the same routine.
 */
export function toLiveWorkoutPayload(
  draft: WorkoutSessionDraft,
  activeEnergyKcal: number | null,
): HealthWorkoutPayload {
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
  };
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
