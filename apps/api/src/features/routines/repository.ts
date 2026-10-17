import { Prisma } from '@prisma/client';
import type { CreateRoutineInput, RoutineExerciseInput, Routine } from '@workout/domain';

import { prisma } from '../../infrastructure/prisma.js';
import { toExerciseTrackingType } from '../exercises/trackingTypes.js';

/**
 * Hydrated write input the repository persists: the shared write contract plus
 * the resolved exercise name (denormalized on RoutineExercise).
 */
export type RoutineWriteInput = Omit<CreateRoutineInput, 'exercises'> & {
  exercises: Array<RoutineExerciseInput & { exerciseName: string }>;
};

type RoutineRecord = Prisma.RoutineGetPayload<{
  include: {
    exercises: {
      include: {
        exercise: {
          select: {
            publicId: true;
            trackingType: true;
          };
        };
        sets: true;
      };
    };
  };
}>;

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
    exercises: record.exercises
      .slice()
      .sort((left, right) => left.orderIndex - right.orderIndex)
      .map((exercise) => ({
        id: exercise.publicId,
        routineId: record.publicId,
        exerciseId: exercise.exercise.publicId,
        exerciseName: exercise.exerciseName,
        orderIndex: exercise.orderIndex,
        restSeconds: exercise.restSeconds ?? undefined,
        supersetGroup: exercise.supersetGroup ?? undefined,
        trackingType: toExerciseTrackingType(exercise.exercise.trackingType),
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
      })),
    },
  };
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
    include: {
      exercises: {
        include: {
          exercise: {
            select: {
              publicId: true,
              trackingType: true,
            },
          },
          sets: true,
        },
      },
    },
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
    include: {
      exercises: {
        include: {
          exercise: {
            select: {
              publicId: true,
              trackingType: true,
            },
          },
          sets: true,
        },
      },
    },
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
      exercises: {
        create: input.exercises.map(toRoutineExerciseCreateInput),
      },
    },
    include: {
      exercises: {
        include: {
          exercise: {
            select: {
              publicId: true,
              trackingType: true,
            },
          },
          sets: true,
        },
      },
    },
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

    return transaction.routine.update({
      where: { id: existingRoutine.id },
      data: {
        name: input.name,
        description: input.description,
        folder: input.folder,
        exercises: {
          create: input.exercises.map(toRoutineExerciseCreateInput),
        },
      },
      include: {
      exercises: {
        include: {
          exercise: {
            select: {
              publicId: true,
              trackingType: true,
            },
          },
          sets: true,
        },
      },
      },
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
