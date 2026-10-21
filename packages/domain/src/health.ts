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
  /** End of the running rest, absent when no rest runs (spec 0018). */
  restEndsAt?: ISODateString;
  /**
   * The up-next set as display text, e.g. "Bench press · 100 kg × 8", already
   * in the workout's display unit; null when every set is done (spec 0035).
   */
  upNext?: string | null;
  /** Sets done and all sets of the workout, warm-ups included (spec 0035). */
  setsDone?: number;
  setsTotal?: number;
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
  /**
   * Active energy burned between two instants, in kcal (spec 0012). Resolves
   * null when there is no data or no permission (the provider may not tell
   * them apart); rejects when the data cannot be read right now, so callers
   * can keep the last known value.
   */
  readActiveEnergyKcal(
    since: ISODateString,
    until?: ISODateString,
  ): Promise<number | null>;
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

/**
 * The active workout as the watch shows it (spec 0025). Display-ready: the
 * current set's target is the text the phone shows, already in the workout's
 * display unit, so no weight number reaches the watch (constitution Art. 4).
 */
export interface WatchWorkoutSnapshot {
  workoutSessionId: string;
  routineName: string;
  startedAt: ISODateString;
  /** Set while the workout is paused. */
  pausedAt?: ISODateString;
  /** Whole seconds of pauses already ended. */
  pausedSeconds: number;
  /** End of the running rest, absent when none runs. */
  restEndsAt?: ISODateString;
  /** The set to do now; absent when every set is done. */
  currentSet?: WatchWorkoutSet;
  /** Sets done so far, warm-ups included: named by the watch's discard confirmation (spec 0035). */
  setsDone?: number;
}

export interface WatchWorkoutSet {
  workoutExerciseId: string;
  workoutSetId: string;
  exerciseName: string;
  /**
   * 1-based number of the set among its exercise's sets of the same kind —
   * warm-ups apart from working sets (spec 0040 FR-1) — and how many there are.
   */
  setNumber: number;
  setCount: number;
  /** The set is a warm-up (spec 0040); absent means a working set. */
  isWarmup?: boolean;
  /** Planned values as shown on the phone, e.g. "60 kg × 8"; empty when none. */
  target: string;
  /**
   * The reps to start the watch's control from (spec 0041 FR-10): present
   * only for a set that records reps on one side; 0 when none is planned.
   */
  reps?: number;
  /** The other planned values beside the reps control, e.g. "60 kg"; empty when none. */
  load?: string;
  /** The rest that ticking this set starts, in seconds; 0 starts none. */
  restSeconds: number;
}

/**
 * What the watch sends back (spec 0025). Requests carry a unique `id` and are
 * applied in the order sent; applying one twice changes nothing (EF-1).
 * `activeEnergy` is the kcal the watch measured for the workout so far (FR-3).
 */
export type WatchWorkoutEvent =
  | {
      kind: 'setDone';
      id: string;
      workoutSessionId: string;
      workoutExerciseId: string;
      workoutSetId: string;
      at: ISODateString;
      /** Reps chosen on the watch (spec 0041 FR-12); absent from older watch builds. */
      reps?: number;
    }
  | { kind: 'pause' | 'resume'; id: string; workoutSessionId: string; at: ISODateString }
  | { kind: 'finishRequested'; id: string; workoutSessionId: string }
  /** Confirmed on the watch; never queued while the phone is unreachable (spec 0035 EF-8). */
  | { kind: 'discardRequested'; id: string; workoutSessionId: string }
  | { kind: 'activeEnergy'; workoutSessionId: string; kcal: number };

export type WatchWorkoutOutcome = 'finished' | 'discarded';

/**
 * Mobile-side boundary for running the active workout on a watch (spec 0025).
 * The phone stays the source of the logged data: the watch mirrors snapshots
 * and sends requests back as events.
 */
export interface WatchWorkoutBridge {
  providerId: HealthProviderId;
  /** Starts the workout on the watch, when its app is installed (FR-2). */
  startWatchWorkout(snapshot: WatchWorkoutSnapshot): Promise<void>;
  updateWatchWorkout(snapshot: WatchWorkoutSnapshot): Promise<void>;
  /** Ends it on the watch: saved to Health when finished, dropped when discarded. */
  endWatchWorkout(workoutSessionId: string, outcome: WatchWorkoutOutcome): Promise<void>;
  /** Events from the watch, in the order sent; returns the unsubscribe. */
  onWatchWorkoutEvent(listener: (event: WatchWorkoutEvent) => void): () => void;
}

