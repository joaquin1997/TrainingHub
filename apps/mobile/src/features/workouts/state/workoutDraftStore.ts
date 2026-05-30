import type {
  CreateWorkoutSessionInput,
  Routine,
  WorkoutSession,
} from '@workout/domain';

export type WorkoutSetDraft = {
  id: string;
  order: number;
  reps: string;
  weightKg: string;
  done: boolean;
  minReps?: number;
  maxReps?: number;
  targetWeight?: number;
};

export type WorkoutExerciseDraft = {
  id: string;
  exerciseId: string;
  exerciseName: string;
  imagePlaceholderText?: string;
  routineExerciseId?: string;
  order: number;
  entries: WorkoutSetDraft[];
};

export type WorkoutSessionDraft = {
  id: string;
  routineId: string;
  routineName: string;
  startedAt: string;
  notes?: string;
  exercises: WorkoutExerciseDraft[];
};

let latestCompletedWorkout: WorkoutSessionDraft | null = null;
let activeWorkout: WorkoutSessionDraft | null = null;
let draftIdCounter = 0;

function nextDraftId(prefix: string) {
  draftIdCounter += 1;
  return `${prefix}-gen-${draftIdCounter}`;
}

function renumberSets(entries: WorkoutSetDraft[]): WorkoutSetDraft[] {
  return entries.map((set, index) => ({ ...set, order: index + 1 }));
}

function renumberExercises(
  exercises: WorkoutExerciseDraft[],
): WorkoutExerciseDraft[] {
  return exercises.map((exercise, index) => ({ ...exercise, order: index + 1 }));
}

function buildExerciseDrafts(routine: Routine): WorkoutExerciseDraft[] {
  return routine.exercises
    .slice()
    .sort((left, right) => left.orderIndex - right.orderIndex)
    .map((routineExercise) => ({
      id: `draft-${routine.id}-${routineExercise.id}`,
      exerciseId: routineExercise.exerciseId,
      exerciseName: routineExercise.exerciseName,
      imagePlaceholderText: `${routineExercise.exerciseName} image`,
      routineExerciseId: routineExercise.id,
      order: routineExercise.orderIndex,
      entries: routineExercise.sets
        .slice()
        .sort((left, right) => left.setNumber - right.setNumber)
        .map((set) => ({
          id: `draft-set-${routineExercise.id}-${set.setNumber}`,
          order: set.setNumber,
          reps: '',
          weightKg:
            set.targetWeight !== undefined ? String(set.targetWeight) : '',
          done: false,
          minReps: set.minReps,
          maxReps: set.maxReps,
          targetWeight: set.targetWeight,
        })),
    }));
}

export function buildWorkoutSessionDraft(
  routine: Routine,
): WorkoutSessionDraft {
  return {
    id: `workout-session-${routine.id}`,
    routineId: routine.id,
    routineName: routine.name,
    startedAt: new Date().toISOString(),
    exercises: buildExerciseDrafts(routine),
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
        weightKg: previousSet?.weightKg ?? '',
        done: false,
      };

      return { ...exercise, entries: [...exercise.entries, newSet] };
    }),
  };
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

export function toggleWorkoutSetDone(
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
        entries: exercise.entries.map((set) =>
          set.id === workoutSetId ? { ...set, done: !set.done } : set,
        ),
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

  return {
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
        reps: Number(set.reps) || undefined,
        weightKg: Number(set.weightKg) || undefined,
        completedAt: set.done ? completedAt : undefined,
      })),
    })),
  };
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
 * Active (in-progress) workout. Kept in memory so a started routine can be
 * resumed when navigating away and back without losing logged sets. Only one
 * workout can be active at a time.
 */
export function startActiveWorkout(routine: Routine): WorkoutSessionDraft {
  if (activeWorkout && activeWorkout.routineId === routine.id) {
    return activeWorkout;
  }

  activeWorkout = buildWorkoutSessionDraft(routine);
  return activeWorkout;
}

export function getActiveWorkout() {
  return activeWorkout;
}

export function setActiveWorkout(workoutDraft: WorkoutSessionDraft) {
  activeWorkout = workoutDraft;
}

export function clearActiveWorkout() {
  activeWorkout = null;
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
        reps: Number(set.reps) || undefined,
        weightKg: Number(set.weightKg) || undefined,
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
