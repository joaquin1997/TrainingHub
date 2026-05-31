import { Prisma } from '@prisma/client';
import type { CreateRoutineInput, RoutineExerciseInput, Routine } from '@workout/domain';

import { prisma } from '../../infrastructure/prisma.js';
import {
  DEVELOPMENT_USER_PUBLIC_ID,
  ensureDevelopmentUser,
} from '../../infrastructure/developmentUser.js';

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

function mapRoutine(record: RoutineRecord): Routine {
  return {
    id: record.publicId,
    userId: DEVELOPMENT_USER_PUBLIC_ID,
    name: record.name,
    description: record.description ?? undefined,
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
    sets: {
      create: exercise.sets.map((set) => ({
        setNumber: set.setNumber,
        minReps: set.minReps,
        maxReps: set.maxReps,
        targetWeight: set.targetWeight,
      })),
    },
  };
}

export async function listRoutines() {
  logRepository('list:start');
  await ensureDevelopmentUser();

  const routines = await prisma.routine.findMany({
    where: {
      user: {
        publicId: DEVELOPMENT_USER_PUBLIC_ID,
      },
    },
    orderBy: { createdAt: 'asc' },
    include: {
      exercises: {
        include: {
          exercise: {
            select: {
              publicId: true,
            },
          },
          sets: true,
        },
      },
    },
  });

  const mappedRoutines = routines.map(mapRoutine);

  logRepository('list:success', { count: mappedRoutines.length });

  return mappedRoutines;
}

export async function findRoutineById(id: string) {
  logRepository('findById:start', { id });
  await ensureDevelopmentUser();

  const routine = await prisma.routine.findFirst({
    where: {
      publicId: id,
      user: {
        publicId: DEVELOPMENT_USER_PUBLIC_ID,
      },
    },
    include: {
      exercises: {
        include: {
          exercise: {
            select: {
              publicId: true,
            },
          },
          sets: true,
        },
      },
    },
  });

  const mappedRoutine = routine ? mapRoutine(routine) : null;

  logRepository('findById:success', {
    id,
    found: mappedRoutine !== null,
  });

  return mappedRoutine;
}

export async function createRoutine(input: RoutineWriteInput) {
  logRepository('create:start', {
    name: input.name,
    exercisesCount: input.exercises.length,
  });
  await ensureDevelopmentUser();

  const routine = await prisma.routine.create({
    data: {
      user: {
        connect: {
          publicId: DEVELOPMENT_USER_PUBLIC_ID,
        },
      },
      name: input.name,
      description: input.description,
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
            },
          },
          sets: true,
        },
      },
    },
  });

  const mappedRoutine = mapRoutine(routine);

  logRepository('create:success', {
    id: mappedRoutine.id,
    exercisesCount: mappedRoutine.exercises.length,
  });

  return mappedRoutine;
}

export async function updateRoutine(id: string, input: RoutineWriteInput) {
  logRepository('update:start', {
    id,
    name: input.name,
    exercisesCount: input.exercises.length,
  });
  await ensureDevelopmentUser();

  const existingRoutine = await prisma.routine.findFirst({
    where: {
      publicId: id,
      user: {
        publicId: DEVELOPMENT_USER_PUBLIC_ID,
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
            },
          },
          sets: true,
        },
      },
      },
    });
  });

  const mappedRoutine = mapRoutine(routine);

  logRepository('update:success', {
    id: mappedRoutine.id,
    exercisesCount: mappedRoutine.exercises.length,
  });

  return mappedRoutine;
}

export async function deleteRoutine(id: string) {
  logRepository('delete:start', { id });
  await ensureDevelopmentUser();

  const existingRoutine = await prisma.routine.findFirst({
    where: {
      publicId: id,
      user: {
        publicId: DEVELOPMENT_USER_PUBLIC_ID,
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
