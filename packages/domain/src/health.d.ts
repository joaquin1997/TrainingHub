import type { HealthSyncRecord, ISODateString, WorkoutSession } from './entities.js';
export type HealthProviderId = 'apple-health' | 'android-health-connect';
/**
 * Represents a lightweight workout payload passed to health integrations.
 */
export interface HealthWorkoutPayload {
    workoutSessionId: string;
    routineId?: string;
    startedAt: ISODateString;
    completedAt?: ISODateString;
    exerciseCount: number;
}
/**
 * Mobile-side boundary for checking availability and permission state of a health provider.
 */
export interface HealthIntegration {
    providerId: HealthProviderId;
    displayName: string;
    isAvailable(): Promise<boolean>;
    requestPermissions(): Promise<boolean>;
}
/**
 * Backend-side boundary for syncing completed workout sessions to an external health provider.
 */
export interface WorkoutSyncService {
    providerId: HealthProviderId;
    syncWorkoutSession(workoutSession: WorkoutSession): Promise<HealthSyncRecord>;
}
/**
 * Mobile-side boundary for future live workout mirroring to watches or native health surfaces.
 */
export interface LiveWorkoutBridge {
    providerId: HealthProviderId;
    startLiveWorkout(payload: HealthWorkoutPayload): Promise<void>;
    updateLiveWorkout(payload: HealthWorkoutPayload): Promise<void>;
    finishLiveWorkout(payload: HealthWorkoutPayload): Promise<void>;
}
