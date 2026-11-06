import { Prisma } from '@prisma/client';
import type {
  CreateWorkoutSessionInput,
  ExerciseLastPerformance,
  WorkoutSession,
  WorkoutSetType,
} from '@workout/domain';

import { prisma } from '../../infrastructure/prisma.js';
import { exerciseDisplayName } from '../../infrastructure/requestLanguage.js';
import { usableExerciseWhere } from '../exercises/visibility.js';
import {
  isLegacySession,
  isPerformedSet,
  isWarmupSet,
  pickLastPerformance,
} from './performedSets.js';
import {
  dropForeignLinks,
  findUnknownExercise,
  referencedIds,
  UnknownExerciseError,
} from './saveReferences.js';

/**
 * How many recent workouts containing an exercise "last time" looks through
 * for one with performed sets (spec 0013).
 * TODO(sdd): raise it or page the look-back only if "last time" is seen missing
 * in practice.
 */
const LAST_PERFORMANCE_LOOKBACK = 10;

export const workoutSessionInclude = {
  routine: { select: { publicId: true } },
  exercises: {
    include: {
      exercise: { select: { publicId: true, name: true, nameEs: true, nameEn: true } },
      routineExercise: { select: { publicId: true } },
      sets: true,
    },
  },
  warmUpItems: true,
} satisfies Prisma.WorkoutSessionInclude;

type WorkoutSessionRecord = Prisma.WorkoutSessionGetPayload<{
  include: typeof workoutSessionInclude;
}>;

function logRepository(action: string, payload?: Record<string, unknown>) {
  console.info('[workoutsRepository]', action, payload ?? {});
}

export function mapWorkoutSession(
  userPublicId: string,
  record: WorkoutSessionRecord,
): WorkoutSession {
  const legacy = isLegacySession(
    record.exercises.flatMap((exercise) => exercise.sets),
  );

  return {
    revision: record.revision,
    clientId: record.clientId ?? undefined,
    id: record.publicId,
    userId: userPublicId,
    routineId: record.routine?.publicId ?? undefined,
    status: record.status as WorkoutSession['status'],
    startedAt: record.startedAt.toISOString(),
    completedAt: record.completedAt?.toISOString() ?? undefined,
    pausedSeconds: record.pausedSeconds,
    notes: record.notes ?? undefined,
    // Spec 0024: listed only when the workout had a warm-up block.
    warmUpItems:
      record.warmUpItems.length > 0
        ? record.warmUpItems
            .slice()
            .sort((left, right) => left.order - right.order)
            .map((item) => ({
              order: item.order,
              name: item.name,
              targetDurationSeconds: item.targetDurationSeconds ?? undefined,
              targetReps: item.targetReps ?? undefined,
              done: item.done,
            }))
        : undefined,
    exercises: record.exercises
      .slice()
      .sort((left, right) => left.order - right.order)
      .map((exercise) => ({
        id: exercise.publicId,
        workoutSessionId: record.publicId,
        exerciseId: exercise.exercise.publicId,
        exerciseName: exerciseDisplayName(exercise.exercise),
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
            repsLeft: set.repsLeft ?? undefined,
            repsRight: set.repsRight ?? undefined,
            weightKg: set.weightKg ?? undefined,
            durationSeconds: set.durationSeconds ?? undefined,
            distanceMeters: set.distanceMeters ?? undefined,
            restSeconds: set.restSeconds ?? undefined,
            isWarmup: set.isWarmup,
            completedAt: set.completedAt?.toISOString() ?? undefined,
            performed: isPerformedSet(set, legacy),
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
        repsLeft: set.repsLeft,
        repsRight: set.repsRight,
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
  const recent = await prisma.workoutExercise.findMany({
    where: {
      exercise: { publicId: exerciseId },
      workoutSession: { user: { publicId: userPublicId } },
    },
    orderBy: { workoutSession: { startedAt: 'desc' } },
    take: LAST_PERFORMANCE_LOOKBACK,
    include: {
      sets: true,
      workoutSession: {
        select: {
          startedAt: true,
          completedAt: true,
          // One row is enough to know the session is not a legacy one.
          exercises: {
            where: { sets: { some: { completedAt: { not: null } } } },
            select: { id: true },
            take: 1,
          },
        },
      },
    },
  });

  const picked = pickLastPerformance(
    recent.map((workoutExercise) => ({
      performedAt: (
        workoutExercise.workoutSession.completedAt ??
        workoutExercise.workoutSession.startedAt
      ).toISOString(),
      sessionHasCompletedSet: workoutExercise.workoutSession.exercises.length > 0,
      sets: workoutExercise.sets,
    })),
  );

  if (!picked) {
    return null;
  }

  return {
    performedAt: picked.performedAt,
    sets: picked.sets
      .slice()
      .sort((left, right) => left.order - right.order)
      .map((set) => ({
        order: set.order,
        reps: set.reps ?? undefined,
        repsLeft: set.repsLeft ?? undefined,
        repsRight: set.repsRight ?? undefined,
        weightKg: set.weightKg ?? undefined,
        durationSeconds: set.durationSeconds ?? undefined,
        distanceMeters: set.distanceMeters ?? undefined,
        // Spec 0031: today's sets pair with last time's sets of the same kind.
        isWarmup: isWarmupSet(set) || undefined,
      })),
  };
}

async function findWorkoutSessionByClientId(
  userPublicId: string,
  clientId: string,
) {
  const session = await prisma.workoutSession.findFirst({
    where: { clientId, user: { publicId: userPublicId } },
    include: workoutSessionInclude,
  });

  return session ? mapWorkoutSession(userPublicId, session) : null;
}

/**
 * Which of the referenced records exist and belong to the user: routines and
 * routine slots of their own; exercises from the catalog, their own, or held
 * — already in one of their routines or saved workouts (spec 0015 FR-6, FR-7,
 * EF-1). Any other exercise counts as unknown (EF-2).
 */
async function resolveOwnedReferences(
  userPublicId: string,
  input: CreateWorkoutSessionInput,
) {
  const refs = referencedIds(input);
  const [routines, routineExercises, exercises] = await Promise.all([
    refs.routineId
      ? prisma.routine.findMany({
          where: { publicId: refs.routineId, user: { publicId: userPublicId } },
          select: { publicId: true },
        })
      : [],
    refs.routineExerciseIds.length > 0
      ? prisma.routineExercise.findMany({
          where: {
            publicId: { in: refs.routineExerciseIds },
            routine: { user: { publicId: userPublicId } },
          },
          select: { publicId: true },
        })
      : [],
    prisma.exercise.findMany({
      where: { publicId: { in: refs.exerciseIds }, ...usableExerciseWhere(userPublicId) },
      select: { publicId: true },
    }),
  ]);

  const toSet = (rows: { publicId: string }[]) =>
    new Set(rows.map((row) => row.publicId));

  return {
    routineIds: toSet(routines),
    routineExerciseIds: toSet(routineExercises),
    exerciseIds: toSet(exercises),
  };
}

const isClientIdConflict = (error: unknown) =>
  error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';

/**
 * Saves a finished workout (spec 0014). A repeated `clientId` returns the
 * workout saved first (`created: false`); routine links are kept only when
 * they are the user's own; an unknown exercise throws `UnknownExerciseError`.
 */
export async function createWorkoutSession(
  userPublicId: string,
  input: CreateWorkoutSessionInput,
): Promise<{ session: WorkoutSession; created: boolean }> {
  logRepository('create:start', {
    routineId: input.routineId,
    exercisesCount: input.exercises.length,
    hasClientId: Boolean(input.clientId),
  });

  if (input.clientId) {
    const existing = await findWorkoutSessionByClientId(userPublicId, input.clientId);
    if (existing) {
      logRepository('create:replay', { id: existing.id });
      return { session: existing, created: false };
    }
  }

  const owned = await resolveOwnedReferences(userPublicId, input);
  const unknownExercise = findUnknownExercise(input, owned.exerciseIds);
  if (unknownExercise) {
    throw new UnknownExerciseError(unknownExercise);
  }

  const linked = dropForeignLinks(input, owned);

  try {
    const session = await prisma.workoutSession.create({
      data: {
        user: { connect: { publicId: userPublicId } },
        clientId: linked.clientId,
        routine: linked.routineId
          ? { connect: { publicId: linked.routineId } }
          : undefined,
        status: 'completed',
        startedAt: new Date(linked.startedAt),
        completedAt: linked.completedAt ? new Date(linked.completedAt) : undefined,
        pausedSeconds: linked.pausedSeconds ?? 0,
        notes: linked.notes,
        warmUpItems: linked.warmUpItems?.length
          ? {
              create: linked.warmUpItems.map((item, index) => ({
                order: index + 1,
                name: item.name,
                targetDurationSeconds: item.targetDurationSeconds,
                targetReps: item.targetReps,
                done: item.done,
              })),
            }
          : undefined,
        exercises: {
          create: linked.exercises.map(toWorkoutExerciseCreateInput),
        },
      },
      include: workoutSessionInclude,
    });

    const mapped = mapWorkoutSession(userPublicId, session);
    logRepository('create:success', {
      id: mapped.id,
      exercisesCount: mapped.exercises.length,
    });

    return { session: mapped, created: true };
  } catch (error) {
    // A concurrent save of the same workout won the race (EF-2).
    if (input.clientId && isClientIdConflict(error)) {
      const existing = await findWorkoutSessionByClientId(userPublicId, input.clientId);
      if (existing) {
        logRepository('create:replay', { id: existing.id, concurrent: true });
        return { session: existing, created: false };
      }
    }

    throw error;
  }
}
