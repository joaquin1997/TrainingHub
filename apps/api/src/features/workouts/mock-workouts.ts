import type { WorkoutSession } from '@workout/domain';

import { findMockRoutineById } from '../routines/mock-routines.js';

function toExerciseId(exerciseName: string) {
  return `exercise-${exerciseName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')}`;
}

const mockWorkoutSessions: WorkoutSession[] = [
  {
    id: 'workout-session-1',
    userId: 'user-demo',
    routineId: 'routine-upper-a',
    status: 'active',
    startedAt: '2026-01-03T09:00:00.000Z',
    completedAt: undefined,
    notes: 'Mock started session',
    exercises: [
      {
        id: 'workout-exercise-1',
        workoutSessionId: 'workout-session-1',
        exerciseId: 'exercise-flat-bench-press',
        routineExerciseId: 'routine-exercise-upper-a-bench',
        order: 1,
        notes: undefined,
        sets: [
          {
            id: 'workout-set-1',
            workoutExerciseId: 'workout-exercise-1',
            order: 1,
            reps: 8,
            weightKg: 60,
            completedAt: '2026-01-03T09:10:00.000Z',
            createdAt: '2026-01-03T09:10:00.000Z',
            updatedAt: '2026-01-03T09:10:00.000Z',
          },
        ],
        createdAt: '2026-01-03T09:00:00.000Z',
        updatedAt: '2026-01-03T09:10:00.000Z',
      },
    ],
    createdAt: '2026-01-03T09:00:00.000Z',
    updatedAt: '2026-01-03T09:10:00.000Z',
  },
];

type StartWorkoutPayload = {
  userId?: string;
  routineId?: string;
  notes?: string;
};

type AddWorkoutSetPayload = {
  workoutExerciseId?: string;
  exerciseId?: string;
  routineExerciseId?: string;
  reps?: number;
  weightKg?: number;
  durationSeconds?: number;
  distanceMeters?: number;
  isWarmup?: boolean;
};

export function listMockWorkoutSessions() {
  // TODO: Replace mock reads with Prisma-backed workout session queries.
  return mockWorkoutSessions;
}

export function findMockWorkoutSessionById(id: string) {
  // TODO: Replace mock reads with Prisma-backed workout session queries.
  return mockWorkoutSessions.find((workoutSession) => workoutSession.id === id);
}

export function startMockWorkoutSession(payload: StartWorkoutPayload) {
  const now = new Date().toISOString();
  const routine = payload.routineId
    ? findMockRoutineById(payload.routineId)
    : undefined;
  const sessionId = `workout-session-${mockWorkoutSessions.length + 1}`;

  const workoutSession: WorkoutSession = {
    id: sessionId,
    userId: payload.userId ?? 'user-demo',
    routineId: routine?.id,
    status: 'active',
    startedAt: now,
    completedAt: undefined,
    notes: payload.notes,
    exercises:
      routine?.exercises.map((routineExercise) => ({
        id: `workout-exercise-${sessionId}-${routineExercise.orderIndex}`,
        workoutSessionId: sessionId,
        exerciseId: toExerciseId(routineExercise.exerciseName),
        routineExerciseId: routineExercise.id,
        order: routineExercise.orderIndex,
        notes: undefined,
        sets: routineExercise.sets.map((set) => ({
          id: `workout-set-${sessionId}-${routineExercise.id}-${set.setNumber}`,
          workoutExerciseId: `workout-exercise-${sessionId}-${routineExercise.orderIndex}`,
          order: set.setNumber,
          reps: undefined,
          weightKg: set.targetWeight,
          completedAt: undefined,
          createdAt: now,
          updatedAt: now,
        })),
        createdAt: now,
        updatedAt: now,
      })) ?? [],
    createdAt: now,
    updatedAt: now,
  };

  // TODO: Persist started workout sessions and copied routine exercises via Prisma.
  mockWorkoutSessions.push(workoutSession);

  return workoutSession;
}

export function addMockWorkoutSet(
  workoutSessionId: string,
  payload: AddWorkoutSetPayload,
) {
  const workoutSession = findMockWorkoutSessionById(workoutSessionId);

  if (!workoutSession) {
    return null;
  }

  const now = new Date().toISOString();
  let workoutExercise = payload.workoutExerciseId
    ? workoutSession.exercises.find(
        (entry) => entry.id === payload.workoutExerciseId,
      )
    : undefined;

  if (!workoutExercise && payload.exerciseId) {
    workoutExercise = {
      id: `workout-exercise-${workoutSession.id}-${workoutSession.exercises.length + 1}`,
      workoutSessionId: workoutSession.id,
      exerciseId: payload.exerciseId,
      routineExerciseId: payload.routineExerciseId,
      order: workoutSession.exercises.length + 1,
      notes: undefined,
      sets: [],
      createdAt: now,
      updatedAt: now,
    };

    workoutSession.exercises.push(workoutExercise);
  }

  if (!workoutExercise) {
    return {
      error: 'Workout exercise not found',
    };
  }

  const workoutSet = {
    id: `workout-set-${workoutExercise.id}-${workoutExercise.sets.length + 1}`,
    workoutExerciseId: workoutExercise.id,
    order: workoutExercise.sets.length + 1,
    reps: payload.reps,
    weightKg: payload.weightKg,
    durationSeconds: payload.durationSeconds,
    distanceMeters: payload.distanceMeters,
    isWarmup: payload.isWarmup,
    completedAt: now,
    createdAt: now,
    updatedAt: now,
  };

  // TODO: Persist workout set creation and derived workout exercise updates via Prisma.
  workoutExercise.sets.push(workoutSet);
  workoutExercise.updatedAt = now;
  workoutSession.updatedAt = now;

  return {
    workoutSession,
    workoutExercise,
    workoutSet,
  };
}

export function finishMockWorkoutSession(id: string) {
  const workoutSession = findMockWorkoutSessionById(id);

  if (!workoutSession) {
    return null;
  }

  const now = new Date().toISOString();

  workoutSession.status = 'completed';
  workoutSession.completedAt = now;
  workoutSession.updatedAt = now;

  // TODO: Persist workout completion and completion-specific business rules via Prisma.
  return workoutSession;
}
