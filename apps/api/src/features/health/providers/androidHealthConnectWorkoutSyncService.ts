import type {
  HealthSyncRecord,
  WorkoutSession,
  WorkoutSyncService,
} from '@workout/domain';

export const androidHealthConnectWorkoutSyncService: WorkoutSyncService = {
  providerId: 'android-health-connect',
  async syncWorkoutSession(workoutSession: WorkoutSession) {
    const syncRecord: HealthSyncRecord = {
      id: `health-sync-${workoutSession.id}-android-health-connect`,
      userId: workoutSession.userId,
      provider: 'android-health-connect',
      syncedEntityType: 'WorkoutSession',
      syncedEntityId: workoutSession.id,
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // TODO: Replace placeholder sync record creation with Health Connect export orchestration.
    // TODO: Add provider-specific credential handling only when Android sync is requested.
    return syncRecord;
  },
};

