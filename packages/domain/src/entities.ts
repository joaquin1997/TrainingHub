export type EntityId = string;
export type ISODateString = string;

export type WorkoutSessionStatus = 'active' | 'completed' | 'cancelled';
export type HealthSyncStatus = 'pending' | 'synced' | 'failed';

/**
 * Represents an authenticated app user independent from any specific auth provider.
 */
export interface User {
  id: EntityId;
  displayName: string;
  email?: string;
  avatarUrl?: string;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

/**
 * Represents an exercise definition that can be system-provided now and user-defined later.
 */
export type WeightUnit = 'kg' | 'lb';

/** Supported UI languages. `null`/absent means "follow the device locale". */
export type AppLanguage = 'en' | 'es';

/** Per-user client preferences. */
export interface UserSettings {
  unit: WeightUnit;
  defaultRestSeconds: number;
  language: AppLanguage | null;
}

export interface UpdateUserSettingsInput {
  unit?: WeightUnit;
  defaultRestSeconds?: number;
  language?: AppLanguage | null;
}

/**
 * What a set of an exercise records (spec 0021). Existing exercises are
 * `weight_reps`; time is whole seconds and distance is metres.
 */
export type ExerciseTrackingType =
  | 'weight_reps'
  | 'reps'
  | 'duration'
  | 'weight_duration'
  | 'distance_duration';

export interface Exercise {
  id: EntityId;
  name: string;
  description?: string;
  category?: string;
  language?: string;
  source?: string;
  sourceId?: string;
  /** Illustration/GIF URL from the source catalog, if any. */
  imageUrl?: string;
  primaryMuscleGroups?: string[];
  secondaryMuscleGroups?: string[];
  equipment?: string[];
  licenseAuthor?: string;
  lastSourceUpdate?: ISODateString;
  isSystemDefined: boolean;
  createdByUserId?: EntityId;
  /** What its sets record; absent from older servers, meaning `weight_reps`. */
  trackingType?: ExerciseTrackingType;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

/**
 * Write contract for creating a custom exercise.
 */
export interface CreateExerciseInput {
  name: string;
  primaryMuscleGroupIds: string[];
  secondaryMuscleGroupIds: string[];
  /** Defaults to `weight_reps` (spec 0021 FR-2). */
  trackingType?: ExerciseTrackingType;
}

/**
 * Represents one normalized muscle group option from the exercise catalog.
 */
export interface MuscleGroup {
  id: EntityId;
  name: string;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

/**
 * Represents a reusable workout template and must stay separate from performed workout data.
 */
export interface Routine {
  id: EntityId;
  userId: EntityId;
  name: string;
  description?: string;
  /** Optional folder/grouping label for organizing routines. */
  folder?: string;
  exercises: RoutineExercise[];
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

/**
 * Represents one exercise definition inside a routine template.
 */
export interface RoutineExercise {
  id: EntityId;
  routineId: EntityId;
  exerciseId: EntityId;
  exerciseName: string;
  orderIndex: number;
  /** Target rest between sets, in seconds (optional). */
  restSeconds?: number;
  /** Exercises sharing a superset group number are performed together. */
  supersetGroup?: number;
  /** The exercise's tracking type, read from the exercise (spec 0021). */
  trackingType?: ExerciseTrackingType;
  sets: RoutineExerciseSet[];
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

/**
 * Represents one target set definition inside a routine exercise template.
 */
export interface RoutineExerciseSet {
  id: EntityId;
  routineExerciseId: EntityId;
  setNumber: number;
  minReps?: number;
  maxReps?: number;
  targetWeight?: number;
  /** Target time in whole seconds (spec 0021). */
  targetDurationSeconds?: number;
  /** Target distance in metres (spec 0021). */
  targetDistanceMeters?: number;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

/**
 * Write contract for one target set when creating or updating a routine.
 * This is the HTTP payload shape shared by the mobile client and the API.
 */
export interface RoutineSetInput {
  setNumber: number;
  minReps?: number;
  maxReps?: number;
  targetWeight?: number;
  targetDurationSeconds?: number;
  targetDistanceMeters?: number;
}

/**
 * Write contract for one exercise when creating or updating a routine.
 * References the exercise by id only; the API resolves the exercise name.
 */
export interface RoutineExerciseInput {
  exerciseId: EntityId;
  orderIndex: number;
  restSeconds?: number;
  supersetGroup?: number;
  sets: RoutineSetInput[];
}

/**
 * Write contract for creating a routine.
 */
export interface CreateRoutineInput {
  name: string;
  description?: string;
  folder?: string;
  exercises: RoutineExerciseInput[];
}

/**
 * Write contract for updating a routine. Same shape as create for now.
 */
export type UpdateRoutineInput = CreateRoutineInput;

/**
 * Represents a real workout session performed by a user.
 */
export interface WorkoutSession {
  id: EntityId;
  userId: EntityId;
  routineId?: EntityId;
  status: WorkoutSessionStatus;
  startedAt: ISODateString;
  completedAt?: ISODateString;
  /** Whole seconds the workout was paused; active duration = elapsed − this (spec 0011). */
  pausedSeconds?: number;
  notes?: string;
  exercises: WorkoutExercise[];
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

/**
 * Represents one performed exercise inside a specific workout session.
 */
export interface WorkoutExercise {
  id: EntityId;
  workoutSessionId: EntityId;
  exerciseId: EntityId;
  exerciseName: string;
  routineExerciseId?: EntityId;
  order: number;
  notes?: string;
  sets: WorkoutSet[];
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

/**
 * Represents the actual logged data for a performed set.
 */
export type WorkoutSetType = 'normal' | 'warmup' | 'drop' | 'failure';

export interface WorkoutSet {
  id: EntityId;
  workoutExerciseId: EntityId;
  order: number;
  type: WorkoutSetType;
  reps?: number;
  weightKg?: number;
  durationSeconds?: number;
  distanceMeters?: number;
  /** Rest configured for this set when it was completed, in seconds. */
  restSeconds?: number;
  isWarmup?: boolean;
  completedAt?: ISODateString;
  /**
   * Derived by the server on read, never sent or stored: true when the set was
   * marked done, or when its session is a legacy one in which no set was
   * (spec 0013). Absent from older servers — fall back to `completedAt`.
   */
  performed?: boolean;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

/**
 * Write contract for one logged set when saving a completed workout session.
 */
export interface WorkoutSetInput {
  order: number;
  type?: WorkoutSetType;
  reps?: number;
  weightKg?: number;
  durationSeconds?: number;
  distanceMeters?: number;
  restSeconds?: number;
  isWarmup?: boolean;
  completedAt?: ISODateString;
}

/**
 * Write contract for one performed exercise when saving a workout session.
 * References the exercise (and optionally the routine template slot) by id.
 */
export interface WorkoutExerciseInput {
  exerciseId: EntityId;
  routineExerciseId?: EntityId;
  order: number;
  notes?: string;
  sets: WorkoutSetInput[];
}

/**
 * Write contract for saving a completed workout session. The mobile app keeps
 * the live values local during the session and sends the whole session at the end.
 */
export interface CreateWorkoutSessionInput {
  /**
   * Workout identity chosen on the device when the workout starts, unique per
   * user. Saving it again returns the workout saved first instead of creating
   * a duplicate (spec 0014). Absent from older clients.
   */
  clientId?: string;
  /** Optional provenance: dropped by the server unless it is the user's own. */
  routineId?: EntityId;
  startedAt: ISODateString;
  completedAt?: ISODateString;
  /** Whole seconds paused, ≤ completedAt − startedAt (spec 0011). Absent from older clients. */
  pausedSeconds?: number;
  notes?: string;
  exercises: WorkoutExerciseInput[];
}

/**
 * One progress data point for an exercise, aggregated from a single session.
 */
export interface ExerciseProgressPoint {
  date: ISODateString;
  bestWeightKg?: number;
  bestReps?: number;
  totalVolume: number;
  estimatedOneRepMax?: number;
  /** Longest working set, in seconds (spec 0021). */
  bestDurationSeconds?: number;
  /** Longest working set, in metres (spec 0021). */
  bestDistanceMeters?: number;
}

/**
 * Progress summary for one exercise, used by the progress overview list.
 */
export interface ExerciseProgressSummary {
  exerciseId: EntityId;
  exerciseName: string;
  sessionCount: number;
  lastPerformedAt?: ISODateString;
  latestWeightKg?: number;
  latestReps?: number;
  personalBestWeightKg?: number;
  personalBestReps?: number;
  bestEstimatedOneRepMax?: number;
  /** The exercise's current tracking type (spec 0021). */
  trackingType?: ExerciseTrackingType;
  latestDurationSeconds?: number;
  latestDistanceMeters?: number;
  personalBestDurationSeconds?: number;
  personalBestDistanceMeters?: number;
  /**
   * True when the most recent session set a new record: longest time for
   * timed exercises, longest distance for distance ones, heaviest weight
   * otherwise (spec 0021 FR-6).
   */
  isRecordSession: boolean;
}

/**
 * Full progress detail for one exercise: the summary plus per-session points.
 */
export interface ExerciseProgressDetail extends ExerciseProgressSummary {
  points: ExerciseProgressPoint[];
}

/**
 * Total training volume for one calendar week, across all exercises.
 */
export interface WeeklyVolumePoint {
  /** ISO date (YYYY-MM-DD) of the Monday that starts the week. */
  weekStart: ISODateString;
  totalVolume: number;
  workoutCount: number;
}

/**
 * Training volume attributed to one muscle group / exercise category.
 */
export interface MuscleGroupVolumePoint {
  group: string;
  totalVolume: number;
}

/**
 * One previously-logged set for an exercise (for the "last time" hint).
 */
export interface ExerciseLastSet {
  order: number;
  reps?: number;
  weightKg?: number;
  durationSeconds?: number;
  distanceMeters?: number;
}

/**
 * The most recent logged performance of an exercise.
 */
export interface ExerciseLastPerformance {
  performedAt: ISODateString;
  sets: ExerciseLastSet[];
}

/**
 * Stores health integration sync metadata only, never the workout data itself.
 */
export interface HealthSyncRecord {
  id: EntityId;
  userId: EntityId;
  provider: string;
  syncedEntityType: string;
  syncedEntityId: EntityId;
  externalId?: string;
  status: HealthSyncStatus;
  lastSyncedAt?: ISODateString;
  errorMessage?: string;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}
