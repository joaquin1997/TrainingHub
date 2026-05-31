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
export interface Exercise {
  id: EntityId;
  name: string;
  description?: string;
  category?: string;
  language?: string;
  source?: string;
  sourceId?: string;
  primaryMuscleGroups?: string[];
  secondaryMuscleGroups?: string[];
  equipment?: string[];
  licenseAuthor?: string;
  lastSourceUpdate?: ISODateString;
  isSystemDefined: boolean;
  createdByUserId?: EntityId;
  createdAt: ISODateString;
  updatedAt: ISODateString;
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
}

/**
 * Write contract for one exercise when creating or updating a routine.
 * References the exercise by id only; the API resolves the exercise name.
 */
export interface RoutineExerciseInput {
  exerciseId: EntityId;
  orderIndex: number;
  sets: RoutineSetInput[];
}

/**
 * Write contract for creating a routine.
 */
export interface CreateRoutineInput {
  name: string;
  description?: string;
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
  isWarmup?: boolean;
  completedAt?: ISODateString;
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
  routineId?: EntityId;
  startedAt: ISODateString;
  completedAt?: ISODateString;
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
  /** True when the most recent session set a new max-weight record. */
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
 * One previously-logged set for an exercise (for the "last time" hint).
 */
export interface ExerciseLastSet {
  order: number;
  reps?: number;
  weightKg?: number;
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
