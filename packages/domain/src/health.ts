import type {
  HealthSyncRecord,
  ISODateString,
  WorkoutSession,
} from './entities.js';

export type HealthProviderId = 'apple-health' | 'android-health-connect';

/**
 * Represents a lightweight workout payload passed to health integrations.
 */
export interface HealthWorkoutPayload {
  workoutSessionId: string;
  routineId?: string;
  routineName?: string;
  startedAt: ISODateString;
  completedAt?: ISODateString;
  exerciseCount: number;
  /** Set while the workout is paused (spec 0011). */
  pausedAt?: ISODateString;
  /** Whole seconds of pauses already ended. */
  pausedSeconds?: number;
  /** Active energy since the start, in kcal; null when unknown (spec 0012). */
  activeEnergyKcal?: number | null;
}

/**
 * What a live workout surface (e.g. the iOS Live Activity) currently shows. It
 * can change outside the app, e.g. a pause tapped on the lock screen.
 */
export interface LiveWorkoutState {
  workoutSessionId: string;
  pausedAt?: ISODateString;
  pausedSeconds: number;
  updatedAt: ISODateString;
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
 * Mobile-side boundary for mirroring the active workout to a live surface
 * outside the app (the iOS Live Activity today; watches later).
 */
export interface LiveWorkoutBridge {
  providerId: HealthProviderId;
  startLiveWorkout(payload: HealthWorkoutPayload): Promise<void>;
  updateLiveWorkout(payload: HealthWorkoutPayload): Promise<void>;
  finishLiveWorkout(payload: HealthWorkoutPayload): Promise<void>;
  /** What the surface shows now, or null when nothing is shown. Optional: no-op bridges omit it. */
  getLiveWorkoutState?(): Promise<LiveWorkoutState | null>;
  /** Changes made on the surface itself; returns the unsubscribe. */
  onLiveWorkoutStateChange?(listener: (state: LiveWorkoutState) => void): () => void;
}

