import type { Routine, WorkoutSession } from '@workout/domain';

import { findMockRoutineById } from '@/features/routines/mocks/mockRoutines';

export type WorkoutSetDraft = {
  id: string;
  order: number;
  reps: string;
  weightKg: string;
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
  exercises: WorkoutExerciseDraft[];
};

let latestCompletedWorkout: WorkoutSessionDraft | null = null;

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
          minReps: set.minReps,
          maxReps: set.maxReps,
          targetWeight: set.targetWeight,
        })),
    }));
}

export function createWorkoutSessionDraft(
  routineId?: string,
): WorkoutSessionDraft | null {
  const routine = findMockRoutineById(routineId);

  if (!routine) {
    return null;
  }

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

export function saveCompletedWorkout(workoutDraft: WorkoutSessionDraft) {
  latestCompletedWorkout = workoutDraft;
}

export function getLatestCompletedWorkout() {
  return latestCompletedWorkout;
}

export function clearLatestCompletedWorkout() {
  latestCompletedWorkout = null;
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
