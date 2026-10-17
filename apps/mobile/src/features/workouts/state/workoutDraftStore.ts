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
  /** When the current pause began; absent while the clock runs (spec 0011). */
  pausedAt?: string;
  /** Whole seconds of pauses already ended. */
  pausedSeconds?: number;
  /** The rest counting down now; absent when none runs (spec 0018). */
  rest?: RunningRest;
  exercises: WorkoutExerciseDraft[];
};

/**
 * A rest started by ticking a set (spec 0018). The end is absolute, so it
 * survives leaving the screen and restarting the app.
 */
export type RunningRest = {
  /** ISO instant the rest ends. */
  endsAt: string;
  /** Length of the rest, grown by extra time; for the progress line. */
  totalSeconds: number;
  /** The exercise whose set started it. */
  workoutExerciseId: string;
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

const secondsBetween = (fromIso: string, to: Date) =>
  Math.max(0, Math.floor((to.getTime() - new Date(fromIso).getTime()) / 1000));

/** Stops the workout clock; pausing a paused workout changes nothing. */
export function pauseWorkout(
  workoutDraft: WorkoutSessionDraft,
  now: Date = new Date(),
): WorkoutSessionDraft {
  if (workoutDraft.pausedAt) {
    return workoutDraft;
  }

  return { ...workoutDraft, pausedAt: now.toISOString() };
}

/** Restarts the clock, adding the ended pause to the paused total. */
export function resumeWorkout(
  workoutDraft: WorkoutSessionDraft,
  now: Date = new Date(),
): WorkoutSessionDraft {
  if (!workoutDraft.pausedAt) {
    return workoutDraft;
  }

  return {
    ...workoutDraft,
    pausedAt: undefined,
    pausedSeconds:
      (workoutDraft.pausedSeconds ?? 0) + secondsBetween(workoutDraft.pausedAt, now),
  };
}

/** Paused seconds up to `end`, counting a pause still in progress (FR-5). */
export function totalPausedSeconds(
  workoutDraft: WorkoutSessionDraft,
  end: Date = new Date(),
): number {
  const ongoing = workoutDraft.pausedAt ? secondsBetween(workoutDraft.pausedAt, end) : 0;
  return (workoutDraft.pausedSeconds ?? 0) + ongoing;
}

/**
 * The rest a ticked set starts (FR-1): the exercise's own rest — the one set
 * in this workout, otherwise the routine's — or the Settings default.
 */
export function resolveRestSeconds(
  exercise: Pick<WorkoutExerciseDraft, 'restSeconds'>,
  defaultRestSeconds: number,
): number {
  return exercise.restSeconds ?? defaultRestSeconds;
}

/**
 * Changes one exercise's rest for the rest of this workout (FR-2). The routine
 * is never written, and a rest already running is left as it is.
 */
export function setExerciseRest(
  workoutDraft: WorkoutSessionDraft,
  workoutExerciseId: string,
  seconds: number,
): WorkoutSessionDraft {
  const restSeconds = Math.max(0, Math.round(seconds));

  return {
    ...workoutDraft,
    exercises: workoutDraft.exercises.map((exercise) =>
      exercise.id === workoutExerciseId ? { ...exercise, restSeconds } : exercise,
    ),
  };
}

/** Starts a rest, replacing any running one; 0 seconds or less starts nothing. */
export function startRest(
  workoutDraft: WorkoutSessionDraft,
  workoutExerciseId: string,
  seconds: number,
  now: Date = new Date(),
): WorkoutSessionDraft {
  if (!(seconds > 0)) {
    return workoutDraft;
  }

  return {
    ...workoutDraft,
    rest: {
      endsAt: new Date(now.getTime() + seconds * 1000).toISOString(),
      totalSeconds: seconds,
      workoutExerciseId,
    },
  };
}

/**
 * Ticks a set done and starts its exercise's rest from `now` (spec 0018
 * FR-1) — the one rule for the phone and the watch (spec 0025). A set already
 * done, or not found, leaves the workout as it is, so a repeated tick is
 * harmless (EF-1).
 */
export function completeSet(
  workoutDraft: WorkoutSessionDraft,
  workoutExerciseId: string,
  workoutSetId: string,
  defaultRestSeconds: number,
  now: Date = new Date(),
): WorkoutSessionDraft {
  const exercise = workoutDraft.exercises.find((item) => item.id === workoutExerciseId);
  const set = exercise?.entries.find((item) => item.id === workoutSetId);
  if (!exercise || !set || set.done) {
    return workoutDraft;
  }

  const rest = resolveRestSeconds(exercise, defaultRestSeconds);
  return startRest(
    toggleWorkoutSetDone(workoutDraft, workoutExerciseId, workoutSetId, rest),
    workoutExerciseId,
    rest,
    now,
  );
}

/** Whole seconds left in a rest at `now`, never below 0. */
export function restRemainingSeconds(rest: RunningRest, now: Date = new Date()): number {
  return Math.max(0, Math.round((new Date(rest.endsAt).getTime() - now.getTime()) / 1000));
}

/**
 * Moves the end of the running rest by `deltaSeconds` (FR-3), never earlier
 * than now. The total grows with extra time so the progress stays proportional.
 */
export function adjustRest(
  workoutDraft: WorkoutSessionDraft,
  deltaSeconds: number,
  now: Date = new Date(),
): WorkoutSessionDraft {
  const rest = workoutDraft.rest;

  if (!rest) {
    return workoutDraft;
  }

  const endsAtMs = Math.max(
    now.getTime(),
    new Date(rest.endsAt).getTime() + deltaSeconds * 1000,
  );
  const left = Math.max(0, Math.round((endsAtMs - now.getTime()) / 1000));

  return {
    ...workoutDraft,
    rest: {
      ...rest,
      endsAt: new Date(endsAtMs).toISOString(),
      totalSeconds: Math.max(left, rest.totalSeconds + deltaSeconds),
    },
  };
}

/** Ends the running rest now, without an alert. */
export function skipRest(workoutDraft: WorkoutSessionDraft): WorkoutSessionDraft {
  if (!workoutDraft.rest) {
    return workoutDraft;
  }

  return { ...workoutDraft, rest: undefined };
}

/** How long past its end a rest still counts as just ended, not stale. */
export const REST_ENDED_GRACE_MS = 2000;

/**
 * `running` before the end; `ended` up to {@link REST_ENDED_GRACE_MS} after it
 * (alert in the app); `stale` later — cleared without an alert (EF-2, EF-3).
 */
export function restPhase(
  rest: RunningRest,
  now: Date = new Date(),
): 'running' | 'ended' | 'stale' {
  const pastEnd = now.getTime() - new Date(rest.endsAt).getTime();

  if (pastEnd < 0) {
    return 'running';
  }

  return pastEnd <= REST_ENDED_GRACE_MS ? 'ended' : 'stale';
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
  const finishedAt = new Date();
  const completedAt = finishedAt.toISOString();
  const unit = draftUnit(workoutDraft);
  // Never more than the workout lasted, which the server would refuse.
  const pausedSeconds = Math.min(
    totalPausedSeconds(workoutDraft, finishedAt),
    secondsBetween(workoutDraft.startedAt, finishedAt),
  );

  return {
    clientId: workoutDraft.clientId,
    routineId: workoutDraft.routineId,
    startedAt: workoutDraft.startedAt,
    completedAt,
    pausedSeconds,
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
    pausedSeconds: totalPausedSeconds(workoutDraft, new Date(completedAt)),
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
