import type {
  HealthSyncRecord,
  WorkoutSession,
  WorkoutSyncService,
} from '@workout/domain';

export const appleHealthWorkoutSyncService: WorkoutSyncService = {
  providerId: 'apple-health',
  async syncWorkoutSession(workoutSession: WorkoutSession) {
    const syncRecord: HealthSyncRecord = {
      id: `health-sync-${workoutSession.id}-apple-health`,
      userId: workoutSession.userId,
      provider: 'apple-health',
      syncedEntityType: 'WorkoutSession',
      syncedEntityId: workoutSession.id,
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // TODO: Replace placeholder sync record creation with Apple Health export orchestration.
    // TODO: Add token validation and transport security once the backend health sync flow exists.
    return syncRecord;
  },
};

