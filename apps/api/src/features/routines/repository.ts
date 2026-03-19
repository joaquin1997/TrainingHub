import { Prisma } from '@prisma/client';
import type { Routine } from '@workout/domain';

import { prisma } from '../../infrastructure/prisma.js';

const DEVELOPMENT_USER_ID = 'user-development';

type RoutineWriteInput = {
  name: string;
  description?: string;
  exercises: Array<{
    exerciseName: string;
    orderIndex: number;
    sets: Array<{
      setNumber: number;
      minReps?: number;
      maxReps?: number;
      targetWeight?: number;
    }>;
  }>;
};

type RoutineRecord = Prisma.RoutineGetPayload<{
  include: {
    exercises: {
      include: {
        sets: true;
      };
    };
  };
}>;

async function ensureDevelopmentUser() {
  await prisma.user.upsert({
    where: { id: DEVELOPMENT_USER_ID },
    update: {},
    create: {
      id: DEVELOPMENT_USER_ID,
      displayName: 'Development User',
      email: 'dev-user@example.com',
    },
  });
}

function mapRoutine(record: RoutineRecord): Routine {
  return {
    id: record.id,
    userId: record.userId,
    name: record.name,
    description: record.description ?? undefined,
    exercises: record.exercises
      .slice()
      .sort((left, right) => left.orderIndex - right.orderIndex)
      .map((exercise) => ({
        id: exercise.id,
        routineId: exercise.routineId,
        exerciseName: exercise.exerciseName,
        orderIndex: exercise.orderIndex,
        sets: exercise.sets
          .slice()
          .sort((left, right) => left.setNumber - right.setNumber)
          .map((set) => ({
            id: set.id,
            routineExerciseId: set.routineExerciseId,
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
    exerciseName: exercise.exerciseName,
    orderIndex: exercise.orderIndex,
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
  await ensureDevelopmentUser();

  const routines = await prisma.routine.findMany({
    where: { userId: DEVELOPMENT_USER_ID },
    orderBy: { createdAt: 'asc' },
    include: {
      exercises: {
        include: {
          sets: true,
        },
      },
    },
  });

  return routines.map(mapRoutine);
}

export async function findRoutineById(id: string) {
  await ensureDevelopmentUser();

  const routine = await prisma.routine.findFirst({
    where: {
      id,
      userId: DEVELOPMENT_USER_ID,
    },
    include: {
      exercises: {
        include: {
          sets: true,
        },
      },
    },
  });

  return routine ? mapRoutine(routine) : null;
}

export async function createRoutine(input: RoutineWriteInput) {
  await ensureDevelopmentUser();

  const routine = await prisma.routine.create({
    data: {
      userId: DEVELOPMENT_USER_ID,
      name: input.name,
      description: input.description,
      exercises: {
        create: input.exercises.map(toRoutineExerciseCreateInput),
      },
    },
    include: {
      exercises: {
        include: {
          sets: true,
        },
      },
    },
  });

  return mapRoutine(routine);
}

export async function updateRoutine(id: string, input: RoutineWriteInput) {
  await ensureDevelopmentUser();

  const existingRoutine = await prisma.routine.findFirst({
    where: {
      id,
      userId: DEVELOPMENT_USER_ID,
    },
  });

  if (!existingRoutine) {
    return null;
  }

  const routine = await prisma.$transaction(async (transaction) => {
    await transaction.routineExercise.deleteMany({
      where: { routineId: id },
    });

    return transaction.routine.update({
      where: { id },
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
            sets: true,
          },
        },
      },
    });
  });

  return mapRoutine(routine);
}

export async function deleteRoutine(id: string) {
  await ensureDevelopmentUser();

  const existingRoutine = await prisma.routine.findFirst({
    where: {
      id,
      userId: DEVELOPMENT_USER_ID,
    },
  });

  if (!existingRoutine) {
    return false;
  }

  await prisma.routine.delete({
    where: { id },
  });

  return true;
}
