import type {
  CreateWorkoutSessionInput,
  ExerciseLastPerformance,
  Routine,
  WeightUnit,
  WorkoutSession,
  WorkoutSetType,
} from '@workout/domain';

import { kgToInputString, roundWeight, toKg } from '@/lib/weight';

export const WORKOUT_SET_TYPES: WorkoutSetType[] = [
  'normal',
  'warmup',
  'drop',
  'failure',
];

export type WorkoutSetDraft = {
  id: string;
  order: number;
  reps: string;
  /**
   * Weight the user typed, in the session's display unit (see
   * {@link WorkoutSessionDraft.unit}). Converted to canonical kg only when the
   * session is persisted. The `Kg` suffix is historical — treat it as "weight".
   */
  weightKg: string;
  /**
   * Ghosted "previous" values shown as input placeholders (last performance or
   * routine target). When the actual field is left empty these are what gets
   * logged, so an unedited set still records its default — mirroring Hevy.
   * The weight placeholder is in the session's display unit.
   */
  repsPlaceholder?: string;
  weightPlaceholder?: string;
  done: boolean;
  /** Rest configured when this set was marked done, in seconds. */
  restSeconds?: number;
  type: WorkoutSetType;
  minReps?: number;
  maxReps?: number;
  targetWeight?: number;
};

/** Trimmed actual value, falling back to the ghosted placeholder when empty. */
export function effectiveSetValue(value: string, placeholder?: string): string {
  return value.trim() !== '' ? value.trim() : (placeholder ?? '');
}

export type WorkoutExerciseDraft = {
  id: string;
  exerciseId: string;
  exerciseName: string;
  imagePlaceholderText?: string;
  routineExerciseId?: string;
  restSeconds?: number;
  supersetGroup?: number;
  order: number;
  entries: WorkoutSetDraft[];
};

export type WorkoutSessionDraft = {
  id: string;
  /**
   * Workout identity sent with the save, unique per workout (spec 0014). The
   * server returns the first save for a repeated identity, so retries never
   * duplicate. `id` cannot serve: it repeats for the same routine.
   */
  clientId: string;
  routineId: string;
  routineName: string;
  startedAt: string;
  notes?: string;
  /**
   * Display unit captured when the workout started. All weight strings in the
   * draft are in this unit; conversion to canonical kg happens on persist.
   * Optional for backwards-compat — absent means kg.
   */
  unit?: WeightUnit;
  exercises: WorkoutExerciseDraft[];
};

/** The session's display unit, defaulting to kg when unset. */
function draftUnit(workoutDraft: WorkoutSessionDraft): WeightUnit {
  return workoutDraft.unit ?? 'kg';
}

let latestCompletedWorkout: WorkoutSessionDraft | null = null;
let activeWorkout: WorkoutSessionDraft | null = null;
let draftIdCounter = 0;
/**
 * Time-based prefix for generated ids. The counter restarts with the app, and a
 * draft restored after a restart (spec 0010) already holds ids from the
 * previous run; the seed keeps new ids from colliding with them.
 */
const draftIdSeed = Date.now().toString(36);

function nextDraftId(prefix: string) {
  draftIdCounter += 1;
  return `${prefix}-gen-${draftIdSeed}-${draftIdCounter}`;
}

function renumberSets(entries: WorkoutSetDraft[]): WorkoutSetDraft[] {
  return entries.map((set, index) => ({ ...set, order: index + 1 }));
}

function renumberExercises(
  exercises: WorkoutExerciseDraft[],
): WorkoutExerciseDraft[] {
  return exercises.map((exercise, index) => ({ ...exercise, order: index + 1 }));
}

function buildExerciseDrafts(
  routine: Routine,
  unit: WeightUnit,
): WorkoutExerciseDraft[] {
  return routine.exercises
    .slice()
    .sort((left, right) => left.orderIndex - right.orderIndex)
    .map((routineExercise) => ({
      id: `draft-${routine.id}-${routineExercise.id}`,
      exerciseId: routineExercise.exerciseId,
      exerciseName: routineExercise.exerciseName,
      imagePlaceholderText: `${routineExercise.exerciseName} image`,
      routineExerciseId: routineExercise.id,
      restSeconds: routineExercise.restSeconds,
      supersetGroup: routineExercise.supersetGroup,
      order: routineExercise.orderIndex,
      entries: routineExercise.sets
        .slice()
        .sort((left, right) => left.setNumber - right.setNumber)
        .map((set) => ({
          id: `draft-set-${routineExercise.id}-${set.setNumber}`,
          order: set.setNumber,
          reps: '',
          weightKg: '',
          repsPlaceholder:
            set.maxReps !== undefined
              ? String(set.maxReps)
              : set.minReps !== undefined
                ? String(set.minReps)
                : undefined,
          weightPlaceholder:
            set.targetWeight !== undefined
              ? kgToInputString(set.targetWeight, unit)
              : undefined,
          done: false,
          type: 'normal',
          minReps: set.minReps,
          maxReps: set.maxReps,
          targetWeight: set.targetWeight,
        })),
    }));
}

/** A per-workout identity; unique per user is enough, so no UUID dependency. */
export function createWorkoutClientId(): string {
  const random = Math.random().toString(36).slice(2, 10).padEnd(8, '0');
  return `${Date.now().toString(36)}-${random}`;
}

export function buildWorkoutSessionDraft(
  routine: Routine,
  unit: WeightUnit = 'kg',
): WorkoutSessionDraft {
  return {
    id: `workout-session-${routine.id}`,
    clientId: createWorkoutClientId(),
    routineId: routine.id,
    routineName: routine.name,
    startedAt: new Date().toISOString(),
    unit,
    exercises: buildExerciseDrafts(routine, unit),
  };
}

export function updateWorkoutSetDraft(
  workoutDraft: WorkoutSessionDraft,
  workoutExerciseId: string,
  workoutSetId: string,
  field: 'reps' | 'weightKg',
  value: string,
): WorkoutSessionDraft {
  return {
    ...workoutDraft,
    exercises: workoutDraft.exercises.map((exercise) => {
      if (exercise.id !== workoutExerciseId) {
        return exercise;
      }

      return {
        ...exercise,
        entries: exercise.entries.map((set) =>
          set.id === workoutSetId ? { ...set, [field]: value } : set,
        ),
      };
    }),
  };
}

export function addExerciseToWorkout(
  workoutDraft: WorkoutSessionDraft,
  exercise: { id: string; name: string },
): WorkoutSessionDraft {
  const newExercise: WorkoutExerciseDraft = {
    id: nextDraftId('we'),
    exerciseId: exercise.id,
    exerciseName: exercise.name,
    order: workoutDraft.exercises.length + 1,
    entries: [
      {
        id: nextDraftId('we-set'),
        order: 1,
        reps: '',
        weightKg: '',
        done: false,
        type: 'normal',
      },
    ],
  };

  return { ...workoutDraft, exercises: [...workoutDraft.exercises, newExercise] };
}

export function removeExerciseFromWorkout(
  workoutDraft: WorkoutSessionDraft,
  workoutExerciseId: string,
): WorkoutSessionDraft {
  return {
    ...workoutDraft,
    exercises: renumberExercises(
      workoutDraft.exercises.filter(
        (exercise) => exercise.id !== workoutExerciseId,
      ),
    ),
  };
}

export function addSetToWorkoutExercise(
  workoutDraft: WorkoutSessionDraft,
  workoutExerciseId: string,
): WorkoutSessionDraft {
  return {
    ...workoutDraft,
    exercises: workoutDraft.exercises.map((exercise) => {
      if (exercise.id !== workoutExerciseId) {
        return exercise;
      }

      const previousSet = exercise.entries[exercise.entries.length - 1];
      const newSet: WorkoutSetDraft = {
        id: nextDraftId(`${exercise.id}-set`),
        order: exercise.entries.length + 1,
        reps: '',
        weightKg: '',
        repsPlaceholder: previousSet
          ? effectiveSetValue(previousSet.reps, previousSet.repsPlaceholder) ||
            undefined
          : undefined,
        weightPlaceholder: previousSet
          ? effectiveSetValue(previousSet.weightKg, previousSet.weightPlaceholder) ||
            undefined
          : undefined,
        done: false,
        type: 'normal',
      };

      return { ...exercise, entries: [...exercise.entries, newSet] };
    }),
  };
}

/**
 * Fills each set's ghosted placeholders from the exercise's last performance
 * (matched by set order). Only placeholders change — the user's actual entries
 * are untouched — and the same reference is returned when nothing changes, so
 * it is safe to call on every performance fetch without churn.
 */
export function applyLastPerformance(
  workoutDraft: WorkoutSessionDraft,
  exerciseId: string,
  performance: ExerciseLastPerformance,
): WorkoutSessionDraft {
  let changed = false;
  const unit = draftUnit(workoutDraft);

  const exercises = workoutDraft.exercises.map((exercise) => {
    if (exercise.exerciseId !== exerciseId) {
      return exercise;
    }

    const entries = exercise.entries.map((set) => {
      const last = performance.sets.find((item) => item.order === set.order);

      if (!last) {
        return set;
      }

      const repsPlaceholder =
        last.reps !== undefined && last.reps !== null
          ? String(last.reps)
          : set.repsPlaceholder;
      const weightPlaceholder =
        last.weightKg !== undefined && last.weightKg !== null
          ? kgToInputString(last.weightKg, unit)
          : set.weightPlaceholder;

      if (
        repsPlaceholder === set.repsPlaceholder &&
        weightPlaceholder === set.weightPlaceholder
      ) {
        return set;
      }

      changed = true;
      return { ...set, repsPlaceholder, weightPlaceholder };
    });

    return { ...exercise, entries };
  });

  return changed ? { ...workoutDraft, exercises } : workoutDraft;
}

export function removeSetFromWorkoutExercise(
  workoutDraft: WorkoutSessionDraft,
  workoutExerciseId: string,
  workoutSetId: string,
): WorkoutSessionDraft {
  return {
    ...workoutDraft,
    exercises: workoutDraft.exercises.map((exercise) => {
      if (exercise.id !== workoutExerciseId) {
        return exercise;
      }

      return {
        ...exercise,
        entries: renumberSets(
          exercise.entries.filter((set) => set.id !== workoutSetId),
        ),
      };
    }),
  };
}

function moveItem<T>(items: T[], index: number, direction: 'up' | 'down'): T[] {
  const target = direction === 'up' ? index - 1 : index + 1;

  if (target < 0 || target >= items.length) {
    return items;
  }

  const copy = items.slice();
  const moved = copy[index];
  copy[index] = copy[target];
  copy[target] = moved;
  return copy;
}

export function moveWorkoutExercise(
  workoutDraft: WorkoutSessionDraft,
  workoutExerciseId: string,
  direction: 'up' | 'down',
): WorkoutSessionDraft {
  const index = workoutDraft.exercises.findIndex(
    (exercise) => exercise.id === workoutExerciseId,
  );

  if (index === -1) {
    return workoutDraft;
  }

  return {
    ...workoutDraft,
    exercises: renumberExercises(
      moveItem(workoutDraft.exercises, index, direction),
    ),
  };
}

export function moveWorkoutSet(
  workoutDraft: WorkoutSessionDraft,
  workoutExerciseId: string,
  workoutSetId: string,
  direction: 'up' | 'down',
): WorkoutSessionDraft {
  return {
    ...workoutDraft,
    exercises: workoutDraft.exercises.map((exercise) => {
      if (exercise.id !== workoutExerciseId) {
        return exercise;
      }

      const index = exercise.entries.findIndex((set) => set.id === workoutSetId);

      if (index === -1) {
        return exercise;
      }

      return {
        ...exercise,
        entries: renumberSets(moveItem(exercise.entries, index, direction)),
      };
    }),
  };
}

export function cycleWorkoutSetType(
  workoutDraft: WorkoutSessionDraft,
  workoutExerciseId: string,
  workoutSetId: string,
): WorkoutSessionDraft {
  return {
    ...workoutDraft,
    exercises: workoutDraft.exercises.map((exercise) => {
      if (exercise.id !== workoutExerciseId) {
        return exercise;
      }

      return {
        ...exercise,
        entries: exercise.entries.map((set) => {
          if (set.id !== workoutSetId) {
            return set;
          }

          const nextIndex =
            (WORKOUT_SET_TYPES.indexOf(set.type) + 1) % WORKOUT_SET_TYPES.length;
          return { ...set, type: WORKOUT_SET_TYPES[nextIndex]! };
        }),
      };
    }),
  };
}

export function toggleWorkoutSetDone(
  workoutDraft: WorkoutSessionDraft,
  workoutExerciseId: string,
  workoutSetId: string,
  restSeconds?: number,
): WorkoutSessionDraft {
  return {
    ...workoutDraft,
    exercises: workoutDraft.exercises.map((exercise) => {
      if (exercise.id !== workoutExerciseId) {
        return exercise;
      }

      return {
        ...exercise,
        entries: exercise.entries.map((set) => {
          if (set.id !== workoutSetId) {
            return set;
          }

          const done = !set.done;
          // Record the rest used when marking done; clear it when un-marking.
          return { ...set, done, restSeconds: done ? restSeconds : undefined };
        }),
      };
    }),
  };
}

export function countWorkoutSets(workoutDraft: WorkoutSessionDraft) {
  return workoutDraft.exercises.reduce(
    (totals, exercise) => ({
      done: totals.done + exercise.entries.filter((set) => set.done).length,
      total: totals.total + exercise.entries.length,
    }),
    { done: 0, total: 0 },
  );
}

/**
 * Maps the local workout draft to the API write contract for a completed session.
 * The logged reps/weight are entered as strings in the UI, so we coerce them to
 * numbers and drop empty values.
 */
export function toCreateWorkoutSessionInput(
  workoutDraft: WorkoutSessionDraft,
): CreateWorkoutSessionInput {
  const completedAt = new Date().toISOString();
  const unit = draftUnit(workoutDraft);

  return {
    clientId: workoutDraft.clientId,
    routineId: workoutDraft.routineId,
    startedAt: workoutDraft.startedAt,
    completedAt,
    notes: workoutDraft.notes?.trim() ? workoutDraft.notes.trim() : undefined,
    exercises: workoutDraft.exercises.map((exercise) => ({
      exerciseId: exercise.exerciseId,
      routineExerciseId: exercise.routineExerciseId,
      order: exercise.order,
      sets: exercise.entries.map((set) => ({
        order: set.order,
        type: set.type,
        isWarmup: set.type === 'warmup' || undefined,
        reps: Number(effectiveSetValue(set.reps, set.repsPlaceholder)) || undefined,
        weightKg: effectiveWeightKg(set, unit),
        restSeconds: set.done ? set.restSeconds : undefined,
        completedAt: set.done ? completedAt : undefined,
      })),
    })),
  };
}

/**
 * The set's effective weight in canonical kg, converting from the session's
 * display unit. Empty (no value, no placeholder) yields undefined.
 */
function effectiveWeightKg(
  set: WorkoutSetDraft,
  unit: WeightUnit,
): number | undefined {
  const value = Number(effectiveSetValue(set.weightKg, set.weightPlaceholder));
  if (!value) {
    return undefined;
  }
  return roundWeight(toKg(value, unit));
}

export function saveCompletedWorkout(workoutDraft: WorkoutSessionDraft) {
  latestCompletedWorkout = workoutDraft;
}

export function getLatestCompletedWorkout() {
  return latestCompletedWorkout;
}

export function clearLatestCompletedWorkout() {
  latestCompletedWorkout = null;
}

/**
 * Active (in-progress) workout. The module variable is the single source of
 * truth; screens and the persister observe it through
 * `subscribeActiveWorkout`. Only one workout can be active at a time.
 */
type ActiveWorkoutListener = () => void;
const activeWorkoutListeners = new Set<ActiveWorkoutListener>();

function notifyActiveWorkout() {
  for (const listener of activeWorkoutListeners) {
    listener();
  }
}

/** Calls `listener` after every change to the active workout; returns the unsubscribe. */
export function subscribeActiveWorkout(listener: ActiveWorkoutListener) {
  activeWorkoutListeners.add(listener);
  return () => {
    activeWorkoutListeners.delete(listener);
  };
}

/** Public id of the person the active workout belongs to (spec 0010 FR-3). */
let activeWorkoutOwnerId: string | null = null;

export function startActiveWorkout(
  routine: Routine,
  unit: WeightUnit = 'kg',
  ownerId?: string,
): WorkoutSessionDraft {
  if (activeWorkout && activeWorkout.routineId === routine.id) {
    return activeWorkout;
  }

  activeWorkout = buildWorkoutSessionDraft(routine, unit);
  activeWorkoutOwnerId = ownerId ?? null;
  notifyActiveWorkout();
  return activeWorkout;
}

/** Puts a draft restored from device storage back as the active workout. */
export function hydrateActiveWorkout(
  workoutDraft: WorkoutSessionDraft,
  ownerId: string,
) {
  activeWorkout = workoutDraft;
  activeWorkoutOwnerId = ownerId;
  notifyActiveWorkout();
}

export function getActiveWorkout() {
  return activeWorkout;
}

export function getActiveWorkoutOwnerId() {
  return activeWorkoutOwnerId;
}

/**
 * Called on every sign-in (FR-8): an active workout started by someone else is
 * discarded, so it is neither shown to nor saved under the new person. One
 * with no recorded owner is adopted — it cannot be shown to belong to anyone
 * else, and dropping it would lose logged sets.
 */
export function discardActiveWorkoutIfForeign(userId: string) {
  if (activeWorkout === null) {
    return;
  }

  if (activeWorkoutOwnerId === null) {
    activeWorkoutOwnerId = userId;
    return;
  }

  if (activeWorkoutOwnerId !== userId) {
    clearActiveWorkout();
  }
}

export function setActiveWorkout(workoutDraft: WorkoutSessionDraft) {
  activeWorkout = workoutDraft;
  notifyActiveWorkout();
}

export function clearActiveWorkout() {
  if (activeWorkout === null) {
    return;
  }

  activeWorkout = null;
  activeWorkoutOwnerId = null;
  notifyActiveWorkout();
}

export function hasActiveWorkout() {
  return activeWorkout !== null;
}

export function isActiveWorkoutForRoutine(routineId?: string) {
  return activeWorkout !== null && activeWorkout.routineId === routineId;
}

export function toWorkoutSessionSkeleton(
  workoutDraft: WorkoutSessionDraft,
): WorkoutSession {
  const completedAt = new Date().toISOString();
  const unit = draftUnit(workoutDraft);

  return {
    id: workoutDraft.id,
    userId: 'user-demo',
    routineId: workoutDraft.routineId,
    status: 'completed',
    startedAt: workoutDraft.startedAt,
    completedAt,
    exercises: workoutDraft.exercises.map((exercise) => ({
      id: exercise.id,
      workoutSessionId: workoutDraft.id,
      exerciseId: exercise.exerciseId,
      exerciseName: exercise.exerciseName,
      routineExerciseId: exercise.routineExerciseId,
      order: exercise.order,
      sets: exercise.entries.map((set) => ({
        id: set.id,
        workoutExerciseId: exercise.id,
        order: set.order,
        type: set.type,
        reps: Number(effectiveSetValue(set.reps, set.repsPlaceholder)) || undefined,
        weightKg: effectiveWeightKg(set, unit),
        restSeconds: set.restSeconds,
        completedAt,
        createdAt: completedAt,
        updatedAt: completedAt,
      })),
      createdAt: completedAt,
      updatedAt: completedAt,
    })),
    createdAt: completedAt,
    updatedAt: completedAt,
  };
}
