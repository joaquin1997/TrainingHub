import { Prisma } from '@prisma/client';
import type {
  CreateWorkoutSessionInput,
  ExerciseLastPerformance,
  WorkoutSession,
  WorkoutSetType,
} from '@workout/domain';

import { prisma } from '../../infrastructure/prisma.js';

type WorkoutSessionRecord = Prisma.WorkoutSessionGetPayload<{
  include: {
    routine: { select: { publicId: true } };
    exercises: {
      include: {
        exercise: { select: { publicId: true; name: true } };
        routineExercise: { select: { publicId: true } };
        sets: true;
      };
    };
  };
}>;

const workoutSessionInclude = {
  routine: { select: { publicId: true } },
  exercises: {
    include: {
      exercise: { select: { publicId: true, name: true } },
      routineExercise: { select: { publicId: true } },
      sets: true,
    },
  },
} satisfies Prisma.WorkoutSessionInclude;

function logRepository(action: string, payload?: Record<string, unknown>) {
  console.info('[workoutsRepository]', action, payload ?? {});
}

function mapWorkoutSession(
  userPublicId: string,
  record: WorkoutSessionRecord,
): WorkoutSession {
  return {
    id: record.publicId,
    userId: userPublicId,
    routineId: record.routine?.publicId ?? undefined,
    status: record.status as WorkoutSession['status'],
    startedAt: record.startedAt.toISOString(),
    completedAt: record.completedAt?.toISOString() ?? undefined,
    notes: record.notes ?? undefined,
    exercises: record.exercises
      .slice()
      .sort((left, right) => left.order - right.order)
      .map((exercise) => ({
        id: exercise.publicId,
        workoutSessionId: record.publicId,
        exerciseId: exercise.exercise.publicId,
        exerciseName: exercise.exercise.name,
        routineExerciseId: exercise.routineExercise?.publicId ?? undefined,
        order: exercise.order,
        notes: exercise.notes ?? undefined,
        sets: exercise.sets
          .slice()
          .sort((left, right) => left.order - right.order)
          .map((set) => ({
            id: set.publicId,
            workoutExerciseId: exercise.publicId,
            order: set.order,
            type: set.type as WorkoutSetType,
            reps: set.reps ?? undefined,
            weightKg: set.weightKg ?? undefined,
            durationSeconds: set.durationSeconds ?? undefined,
            distanceMeters: set.distanceMeters ?? undefined,
            restSeconds: set.restSeconds ?? undefined,
            isWarmup: set.isWarmup,
            completedAt: set.completedAt?.toISOString() ?? undefined,
            createdAt: set.createdAt.toISOString(),
            updatedAt: set.updatedAt.toISOString(),
          })),
        createdAt: exercise.createdAt.toISOString(),
        updatedAt: exercise.updatedAt.toISOString(),
      })),
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

function toWorkoutExerciseCreateInput(
  exercise: CreateWorkoutSessionInput['exercises'][number],
): Prisma.WorkoutExerciseCreateWithoutWorkoutSessionInput {
  return {
    exercise: { connect: { publicId: exercise.exerciseId } },
    routineExercise: exercise.routineExerciseId
      ? { connect: { publicId: exercise.routineExerciseId } }
      : undefined,
    order: exercise.order,
    notes: exercise.notes,
    sets: {
      create: exercise.sets.map((set) => ({
        order: set.order,
        type: set.type ?? 'normal',
        reps: set.reps,
        weightKg: set.weightKg,
        durationSeconds: set.durationSeconds,
        distanceMeters: set.distanceMeters,
        restSeconds: set.restSeconds,
        isWarmup: set.isWarmup ?? false,
        completedAt: set.completedAt ? new Date(set.completedAt) : undefined,
      })),
    },
  };
}

export async function listWorkoutSessions(userPublicId: string) {
  logRepository('list:start');

  const sessions = await prisma.workoutSession.findMany({
    where: { user: { publicId: userPublicId } },
    orderBy: { startedAt: 'desc' },
    include: workoutSessionInclude,
  });

  logRepository('list:success', { count: sessions.length });

  return sessions.map((session) => mapWorkoutSession(userPublicId, session));
}

export async function findWorkoutSessionById(userPublicId: string, id: string) {
  logRepository('findById:start', { id });

  const session = await prisma.workoutSession.findFirst({
    where: {
      publicId: id,
      user: { publicId: userPublicId },
    },
    include: workoutSessionInclude,
  });

  const mapped = session ? mapWorkoutSession(userPublicId, session) : null;
  logRepository('findById:success', { id, found: mapped !== null });

  return mapped;
}

export async function getExerciseLastPerformance(
  userPublicId: string,
  exerciseId: string,
): Promise<ExerciseLastPerformance | null> {
  const workoutExercise = await prisma.workoutExercise.findFirst({
    where: {
      exercise: { publicId: exerciseId },
      workoutSession: { user: { publicId: userPublicId } },
    },
    orderBy: { workoutSession: { startedAt: 'desc' } },
    include: {
      sets: true,
      workoutSession: { select: { startedAt: true, completedAt: true } },
    },
  });

  if (!workoutExercise) {
    return null;
  }

  return {
    performedAt: (
      workoutExercise.workoutSession.completedAt ??
      workoutExercise.workoutSession.startedAt
    ).toISOString(),
    sets: workoutExercise.sets
      .slice()
      .sort((left, right) => left.order - right.order)
      .map((set) => ({
        order: set.order,
        reps: set.reps ?? undefined,
        weightKg: set.weightKg ?? undefined,
      })),
  };
}

export async function createWorkoutSession(
  userPublicId: string,
  input: CreateWorkoutSessionInput,
) {
  logRepository('create:start', {
    routineId: input.routineId,
    exercisesCount: input.exercises.length,
  });

  const session = await prisma.workoutSession.create({
    data: {
      user: { connect: { publicId: userPublicId } },
      routine: input.routineId
        ? { connect: { publicId: input.routineId } }
        : undefined,
      status: 'completed',
      startedAt: new Date(input.startedAt),
      completedAt: input.completedAt ? new Date(input.completedAt) : undefined,
      notes: input.notes,
      exercises: {
        create: input.exercises.map(toWorkoutExerciseCreateInput),
      },
    },
    include: workoutSessionInclude,
  });

  const mapped = mapWorkoutSession(userPublicId, session);
  logRepository('create:success', {
    id: mapped.id,
    exercisesCount: mapped.exercises.length,
  });

  return mapped;
}
