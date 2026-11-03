import { Prisma } from '@prisma/client';
import type { CreateRoutineInput, RoutineExerciseInput, Routine } from '@workout/domain';

import { prisma } from '../../infrastructure/prisma.js';
import { exerciseDisplayName } from '../../infrastructure/requestLanguage.js';
import { toExerciseTrackingType } from '../exercises/trackingTypes.js';

/**
 * Hydrated write input the repository persists: the shared write contract plus
 * the resolved exercise name (denormalized on RoutineExercise).
 */
export type RoutineWriteInput = Omit<CreateRoutineInput, 'exercises'> & {
  exercises: Array<RoutineExerciseInput & { exerciseName: string }>;
};

const routineInclude = {
  exercises: {
    include: {
      exercise: {
        select: {
          publicId: true,
          name: true,
          nameEs: true,
          nameEn: true,
          trackingType: true,
          isUnilateral: true,
          deletedAt: true,
        },
      },
      sets: true,
    },
  },
  warmUpItems: true,
} satisfies Prisma.RoutineInclude;

type RoutineRecord = Prisma.RoutineGetPayload<{ include: typeof routineInclude }>;

function logRepository(action: string, payload?: Record<string, unknown>) {
  console.info('[routinesRepository]', action, payload ?? {});
}

function mapRoutine(userPublicId: string, record: RoutineRecord): Routine {
  return {
    id: record.publicId,
    userId: userPublicId,
    name: record.name,
    description: record.description ?? undefined,
    folder: record.folder ?? undefined,
    warmUpItems: record.warmUpItems
      .slice()
      .sort((left, right) => left.orderIndex - right.orderIndex)
      .map((item) => ({
        order: item.orderIndex,
        name: item.name,
        targetDurationSeconds: item.targetDurationSeconds ?? undefined,
        targetReps: item.targetReps ?? undefined,
      })),
    exercises: record.exercises
      .slice()
      .sort((left, right) => left.orderIndex - right.orderIndex)
      .map((exercise) => ({
        id: exercise.publicId,
        routineId: record.publicId,
        exerciseId: exercise.exercise.publicId,
        // A reviewed exercise reads in the app's language; others keep the
        // name saved with the routine (spec 0044 FR-2).
        exerciseName: exercise.exercise.nameEs
          ? exerciseDisplayName(exercise.exercise)
          : exercise.exerciseName,
        orderIndex: exercise.orderIndex,
        restSeconds: exercise.restSeconds ?? undefined,
        supersetGroup: exercise.supersetGroup ?? undefined,
        trackingType: toExerciseTrackingType(exercise.exercise.trackingType),
        isUnilateral: exercise.exercise.isUnilateral,
        // Spec 0033 FR-7: the slot keeps a deleted exercise, marked as such.
        exerciseDeleted: exercise.exercise.deletedAt ? true : undefined,
        sets: exercise.sets
          .slice()
          .sort((left, right) => left.setNumber - right.setNumber)
          .map((set) => ({
            id: set.publicId,
            routineExerciseId: exercise.publicId,
            setNumber: set.setNumber,
            minReps: set.minReps ?? undefined,
            maxReps: set.maxReps ?? undefined,
            targetWeight: set.targetWeight ?? undefined,
            targetDurationSeconds: set.targetDurationSeconds ?? undefined,
            targetDistanceMeters: set.targetDistanceMeters ?? undefined,
            isWarmup: set.isWarmup || undefined,
            isGeneratedWarmup: (set.isWarmup && set.isGeneratedWarmup) || undefined,
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

function toRoutineExerciseCreateInput(
  exercise: RoutineWriteInput['exercises'][number],
) {
  return {
    exercise: {
      connect: {
        publicId: exercise.exerciseId,
      },
    },
    exerciseName: exercise.exerciseName,
    orderIndex: exercise.orderIndex,
    restSeconds: exercise.restSeconds,
    supersetGroup: exercise.supersetGroup,
    sets: {
      create: exercise.sets.map((set) => ({
        setNumber: set.setNumber,
        minReps: set.minReps,
        maxReps: set.maxReps,
        targetWeight: set.targetWeight,
        targetDurationSeconds: set.targetDurationSeconds,
        targetDistanceMeters: set.targetDistanceMeters,
        isWarmup: set.isWarmup ?? false,
        isGeneratedWarmup: Boolean(set.isWarmup && set.isGeneratedWarmup),
      })),
    },
  };
}

/** The block's rows, numbered from 1 in the order sent (spec 0024). */
function toWarmUpItemsCreateInput(items: NonNullable<RoutineWriteInput['warmUpItems']>) {
  return items.map((item, index) => ({
    orderIndex: index + 1,
    name: item.name,
    targetDurationSeconds: item.targetDurationSeconds,
    targetReps: item.targetReps,
  }));
}

export async function listRoutines(userPublicId: string) {
  logRepository('list:start');

  const routines = await prisma.routine.findMany({
    where: {
      user: {
        publicId: userPublicId,
      },
    },
    orderBy: { createdAt: 'asc' },
    include: routineInclude,
  });

  const mappedRoutines = routines.map((routine) =>
    mapRoutine(userPublicId, routine),
  );

  logRepository('list:success', { count: mappedRoutines.length });

  return mappedRoutines;
}

export async function findRoutineById(userPublicId: string, id: string) {
  logRepository('findById:start', { id });

  const routine = await prisma.routine.findFirst({
    where: {
      publicId: id,
      user: {
        publicId: userPublicId,
      },
    },
    include: routineInclude,
  });

  const mappedRoutine = routine ? mapRoutine(userPublicId, routine) : null;

  logRepository('findById:success', {
    id,
    found: mappedRoutine !== null,
  });

  return mappedRoutine;
}

export async function createRoutine(
  userPublicId: string,
  input: RoutineWriteInput,
) {
  logRepository('create:start', {
    name: input.name,
    exercisesCount: input.exercises.length,
  });

  const routine = await prisma.routine.create({
    data: {
      user: {
        connect: {
          publicId: userPublicId,
        },
      },
      name: input.name,
      description: input.description,
      folder: input.folder,
      warmUpItems: input.warmUpItems
        ? { create: toWarmUpItemsCreateInput(input.warmUpItems) }
        : undefined,
      exercises: {
        create: input.exercises.map(toRoutineExerciseCreateInput),
      },
    },
    include: routineInclude,
  });

  const mappedRoutine = mapRoutine(userPublicId, routine);

  logRepository('create:success', {
    id: mappedRoutine.id,
    exercisesCount: mappedRoutine.exercises.length,
  });

  return mappedRoutine;
}

export async function updateRoutine(
  userPublicId: string,
  id: string,
  input: RoutineWriteInput,
) {
  logRepository('update:start', {
    id,
    name: input.name,
    exercisesCount: input.exercises.length,
  });

  const existingRoutine = await prisma.routine.findFirst({
    where: {
      publicId: id,
      user: {
        publicId: userPublicId,
      },
    },
    select: {
      id: true,
    },
  });

  if (!existingRoutine) {
    logRepository('update:not_found', { id });
    return null;
  }

  const routine = await prisma.$transaction(async (transaction) => {
    await transaction.routineExercise.deleteMany({
      where: { routineId: existingRoutine.id },
    });

    // An update without the block (older apps) keeps it (spec 0024).
    if (input.warmUpItems) {
      await transaction.routineWarmUpItem.deleteMany({
        where: { routineId: existingRoutine.id },
      });
    }

    return transaction.routine.update({
      where: { id: existingRoutine.id },
      data: {
        name: input.name,
        description: input.description,
        folder: input.folder,
        warmUpItems: input.warmUpItems
          ? { create: toWarmUpItemsCreateInput(input.warmUpItems) }
          : undefined,
        exercises: {
          create: input.exercises.map(toRoutineExerciseCreateInput),
        },
      },
      include: routineInclude,
    });
  });

  const mappedRoutine = mapRoutine(userPublicId, routine);

  logRepository('update:success', {
    id: mappedRoutine.id,
    exercisesCount: mappedRoutine.exercises.length,
  });

  return mappedRoutine;
}

export async function deleteRoutine(userPublicId: string, id: string) {
  logRepository('delete:start', { id });

  const existingRoutine = await prisma.routine.findFirst({
    where: {
      publicId: id,
      user: {
        publicId: userPublicId,
      },
    },
    select: {
      id: true,
    },
  });

  if (!existingRoutine) {
    logRepository('delete:not_found', { id });
    return false;
  }

  await prisma.routine.delete({
    where: { id: existingRoutine.id },
  });

  logRepository('delete:success', { id });

  return true;
}
