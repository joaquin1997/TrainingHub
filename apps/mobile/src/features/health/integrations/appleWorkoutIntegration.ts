import type { HealthWorkoutPayload, WorkoutSession } from '@workout/domain';

import { appleHealthIntegration, appleHealthLiveWorkoutBridge } from '@/features/health/providers/appleHealth';
import type { WorkoutSessionDraft } from '@/features/workouts/state/workoutDraftStore';

function toHealthWorkoutPayload(
  workoutDraft: WorkoutSessionDraft,
  completedAt?: string,
): HealthWorkoutPayload {
  return {
    workoutSessionId: workoutDraft.id,
    routineId: workoutDraft.routineId,
    startedAt: workoutDraft.startedAt,
    completedAt,
    exerciseCount: workoutDraft.exercises.length,
  };
}

export async function notifyAppleWorkoutStarted(
  workoutDraft: WorkoutSessionDraft,
) {
  const isAvailable = await appleHealthIntegration.isAvailable();

  if (!isAvailable) {
    return;
  }

  // TODO: Gate this behind explicit Apple Health permissions before enabling native behavior.
  // TODO: Replace this stub with Apple Watch live workout mirroring once native modules are requested.
  await appleHealthLiveWorkoutBridge.startLiveWorkout(
    toHealthWorkoutPayload(workoutDraft),
  );
}

export async function notifyAppleWorkoutFinished(
  workoutDraft: WorkoutSessionDraft,
  completedAt: string,
) {
  const isAvailable = await appleHealthIntegration.isAvailable();

  if (!isAvailable) {
    return;
  }

  // TODO: Replace this stub with Apple Watch live workout completion once native modules are requested.
  await appleHealthLiveWorkoutBridge.finishLiveWorkout(
    toHealthWorkoutPayload(workoutDraft, completedAt),
  );
}

export async function syncWorkoutCompletionToAppleHealth(
  workoutSession: WorkoutSession,
) {
  const isAvailable = await appleHealthIntegration.isAvailable();

  if (!isAvailable) {
    return;
  }

  // TODO: Replace this placeholder with a native Apple Health export or a backend-triggered sync handoff.
  // TODO: Add Apple Health authorization checks before attempting real workout completion sync.
  void workoutSession;
}

