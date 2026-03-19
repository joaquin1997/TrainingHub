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
  primaryMuscleGroups?: string[];
  equipment?: string[];
  isSystemDefined: boolean;
  createdByUserId?: EntityId;
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
export interface WorkoutSet {
  id: EntityId;
  workoutExerciseId: EntityId;
  order: number;
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
