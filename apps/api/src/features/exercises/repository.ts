import { Prisma } from '@prisma/client';
import type { Exercise, MuscleGroup } from '@workout/domain';

import { prisma } from '../../infrastructure/prisma.js';
import {
  DEVELOPMENT_USER_PUBLIC_ID,
  ensureDevelopmentUser,
} from '../../infrastructure/developmentUser.js';

const exerciseInclude = {
  createdByUser: {
    select: {
      publicId: true,
    },
  },
  primaryMuscleGroupLinks: {
    include: {
      muscleGroup: true,
    },
    orderBy: {
      muscleGroupId: 'asc',
    },
  },
  secondaryMuscleGroupLinks: {
    include: {
      muscleGroup: true,
    },
    orderBy: {
      muscleGroupId: 'asc',
    },
  },
} satisfies Prisma.ExerciseInclude;

type ExerciseRecord = Prisma.ExerciseGetPayload<{
  include: typeof exerciseInclude;
}>;

type CreateExerciseInput = {
  name: string;
  primaryMuscleGroupIds: string[];
  secondaryMuscleGroupIds: string[];
};

export class InvalidMuscleGroupSelectionError extends Error {
  constructor(message = 'Invalid muscle group selection') {
    super(message);
    this.name = 'InvalidMuscleGroupSelectionError';
  }
}

function mapExercise(record: ExerciseRecord): Exercise {
  return {
    id: record.publicId,
    name: record.name,
    description: record.description ?? undefined,
    category: record.category ?? undefined,
    language: record.language ?? undefined,
    source: record.source,
    sourceId: record.sourceId,
    primaryMuscleGroups: record.primaryMuscleGroupLinks.map(
      (link) => link.muscleGroup.name,
    ),
    secondaryMuscleGroups: record.secondaryMuscleGroupLinks.map(
      (link) => link.muscleGroup.name,
    ),
    equipment: record.equipment,
    licenseAuthor: record.licenseAuthor ?? undefined,
    lastSourceUpdate: record.lastSourceUpdate?.toISOString(),
    isSystemDefined: record.isSystemDefined,
    createdByUserId: record.createdByUser?.publicId,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

function createCustomSourceId() {
  return `custom-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function mapMuscleGroupId(value: string) {
  if (!/^\d+$/.test(value)) {
    throw new InvalidMuscleGroupSelectionError();
  }

  return BigInt(value);
}

function dedupeIds(values: string[]) {
  return Array.from(new Set(values));
}

function mapMuscleGroup(record: {
  id: bigint;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}): MuscleGroup {
  return {
    id: record.id.toString(),
    name: record.name,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

export async function listExercises() {
  const exercises = await prisma.exercise.findMany({
    include: exerciseInclude,
    orderBy: { name: 'asc' },
  });

  return exercises.map(mapExercise);
}

export async function listMuscleGroups() {
  const muscleGroups = await prisma.muscleGroup.findMany({
    orderBy: { name: 'asc' },
  });

  return muscleGroups.map(mapMuscleGroup);
}

export async function findExerciseById(id: string) {
  const exercise = await prisma.exercise.findUnique({
    include: exerciseInclude,
    where: { publicId: id },
  });

  return exercise ? mapExercise(exercise) : null;
}

export async function createExercise(input: CreateExerciseInput) {
  await ensureDevelopmentUser();

  const primaryMuscleGroupIds = dedupeIds(input.primaryMuscleGroupIds);
  const primaryMuscleGroupIdSet = new Set(primaryMuscleGroupIds);
  const secondaryMuscleGroupIds = dedupeIds(input.secondaryMuscleGroupIds).filter(
    (id) => !primaryMuscleGroupIdSet.has(id),
  );

  if (primaryMuscleGroupIds.length === 0) {
    throw new InvalidMuscleGroupSelectionError(
      'At least one primary muscle group is required',
    );
  }

  const selectedMuscleGroups = await prisma.muscleGroup.findMany({
    where: {
      id: {
        in: [...primaryMuscleGroupIds, ...secondaryMuscleGroupIds].map(
          mapMuscleGroupId,
        ),
      },
    },
  });

  const selectedMuscleGroupIdSet = new Set(
    selectedMuscleGroups.map((muscleGroup) => muscleGroup.id.toString()),
  );

  const missingMuscleGroupId = [...primaryMuscleGroupIds, ...secondaryMuscleGroupIds]
    .find((id) => !selectedMuscleGroupIdSet.has(id));

  if (missingMuscleGroupId) {
    throw new InvalidMuscleGroupSelectionError();
  }

  const existingExercise = await prisma.exercise.findFirst({
    include: exerciseInclude,
    where: {
      name: {
        equals: input.name,
        mode: 'insensitive',
      },
    },
  });

  if (existingExercise) {
    return mapExercise(existingExercise);
  }

  const exercise = await prisma.exercise.create({
    include: exerciseInclude,
    data: {
      source: 'custom',
      sourceId: createCustomSourceId(),
      name: input.name,
      equipment: [],
      isSystemDefined: false,
      createdByUser: {
        connect: {
          publicId: DEVELOPMENT_USER_PUBLIC_ID,
        },
      },
      primaryMuscleGroupLinks: {
        create: primaryMuscleGroupIds.map((id) => ({
          muscleGroup: {
            connect: { id: mapMuscleGroupId(id) },
          },
        })),
      },
      secondaryMuscleGroupLinks: {
        create: secondaryMuscleGroupIds.map((id) => ({
          muscleGroup: {
            connect: { id: mapMuscleGroupId(id) },
          },
        })),
      },
    },
  });

  return mapExercise(exercise);
}
