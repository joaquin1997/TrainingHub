import type { WorkoutSession } from '@workout/domain';

import { appleHealthIntegration } from '@/features/health/providers/appleHealth';

// The live workout status is driven by `useLiveWorkoutController` (spec 0012);
// only writing the finished workout to Health remains here, still a stub.

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

