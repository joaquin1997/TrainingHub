import { Prisma } from '@prisma/client';
import type { CreateWorkoutSessionInput, WorkoutSession } from '@workout/domain';

import { prisma } from '../../infrastructure/prisma.js';

const DEVELOPMENT_USER_PUBLIC_ID = 'user-development';

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

async function ensureDevelopmentUser() {
  await prisma.user.upsert({
    where: { publicId: DEVELOPMENT_USER_PUBLIC_ID },
    update: {},
    create: {
      publicId: DEVELOPMENT_USER_PUBLIC_ID,
      displayName: 'Development User',
      email: 'dev-user@example.com',
    },
  });
}

function logRepository(action: string, payload?: Record<string, unknown>) {
  console.info('[workoutsRepository]', action, payload ?? {});
}

function mapWorkoutSession(record: WorkoutSessionRecord): WorkoutSession {
  return {
    id: record.publicId,
    userId: DEVELOPMENT_USER_PUBLIC_ID,
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
            reps: set.reps ?? undefined,
            weightKg: set.weightKg ?? undefined,
            durationSeconds: set.durationSeconds ?? undefined,
            distanceMeters: set.distanceMeters ?? undefined,
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
        reps: set.reps,
        weightKg: set.weightKg,
        durationSeconds: set.durationSeconds,
        distanceMeters: set.distanceMeters,
        isWarmup: set.isWarmup ?? false,
      })),
    },
  };
}

export async function listWorkoutSessions() {
  logRepository('list:start');
  await ensureDevelopmentUser();

  const sessions = await prisma.workoutSession.findMany({
    where: { user: { publicId: DEVELOPMENT_USER_PUBLIC_ID } },
    orderBy: { startedAt: 'desc' },
    include: workoutSessionInclude,
  });

  logRepository('list:success', { count: sessions.length });

  return sessions.map(mapWorkoutSession);
}

export async function findWorkoutSessionById(id: string) {
  logRepository('findById:start', { id });
  await ensureDevelopmentUser();

  const session = await prisma.workoutSession.findFirst({
    where: {
      publicId: id,
      user: { publicId: DEVELOPMENT_USER_PUBLIC_ID },
    },
    include: workoutSessionInclude,
  });

  const mapped = session ? mapWorkoutSession(session) : null;
  logRepository('findById:success', { id, found: mapped !== null });

  return mapped;
}

export async function createWorkoutSession(input: CreateWorkoutSessionInput) {
  logRepository('create:start', {
    routineId: input.routineId,
    exercisesCount: input.exercises.length,
  });
  await ensureDevelopmentUser();

  const session = await prisma.workoutSession.create({
    data: {
      user: { connect: { publicId: DEVELOPMENT_USER_PUBLIC_ID } },
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

  const mapped = mapWorkoutSession(session);
  logRepository('create:success', {
    id: mapped.id,
    exercisesCount: mapped.exercises.length,
  });

  return mapped;
}
