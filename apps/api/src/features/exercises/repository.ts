import { Prisma } from '@prisma/client';
import type { CreateExerciseInput, Exercise, MuscleGroup } from '@workout/domain';

import { prisma } from '../../infrastructure/prisma.js';
import { photoImageUrl } from './photo.js';
import { toExerciseTrackingType } from './trackingTypes.js';

const exerciseInclude = {
  createdByUser: {
    select: {
      publicId: true,
    },
  },
  photo: {
    select: {
      updatedAt: true,
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
    imageUrl:
      record.imageUrl ??
      (record.photo ? photoImageUrl(record.publicId, record.photo.updatedAt) : undefined),
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
    trackingType: toExerciseTrackingType(record.trackingType),
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

export async function listFavoriteExerciseIds(
  userPublicId: string,
): Promise<string[]> {
  const favorites = await prisma.exerciseFavorite.findMany({
    where: { user: { publicId: userPublicId } },
    select: { exercise: { select: { publicId: true } } },
  });

  return favorites.map((favorite) => favorite.exercise.publicId);
}

async function resolveFavoriteIds(
  userPublicId: string,
  exercisePublicId: string,
) {
  const [user, exercise] = await Promise.all([
    prisma.user.findUnique({
      where: { publicId: userPublicId },
      select: { id: true },
    }),
    prisma.exercise.findUnique({
      where: { publicId: exercisePublicId },
      select: { id: true },
    }),
  ]);

  if (!user || !exercise) {
    return null;
  }

  return { userId: user.id, exerciseId: exercise.id };
}

export async function addFavoriteExercise(
  userPublicId: string,
  exercisePublicId: string,
) {
  const ids = await resolveFavoriteIds(userPublicId, exercisePublicId);

  if (!ids) {
    return false;
  }

  await prisma.exerciseFavorite.upsert({
    where: { userId_exerciseId: ids },
    update: {},
    create: ids,
  });

  return true;
}

export async function removeFavoriteExercise(
  userPublicId: string,
  exercisePublicId: string,
) {
  const ids = await resolveFavoriteIds(userPublicId, exercisePublicId);

  if (!ids) {
    return false;
  }

  await prisma.exerciseFavorite.deleteMany({ where: ids });

  return true;
}

export async function createExercise(
  userPublicId: string,
  input: CreateExerciseInput,
) {
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
      trackingType: input.trackingType ?? 'weight_reps',
      createdByUser: {
        connect: {
          publicId: userPublicId,
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

export type ExercisePhotoRecord = {
  data: Buffer;
  updatedAt: Date;
};

export async function findExercisePhoto(
  exercisePublicId: string,
): Promise<ExercisePhotoRecord | null> {
  const photo = await prisma.exercisePhoto.findFirst({
    where: { exercise: { publicId: exercisePublicId } },
    select: { data: true, updatedAt: true },
  });

  return photo
    ? {
        data: Buffer.from(photo.data),
        updatedAt: photo.updatedAt,
      }
    : null;
}

export type PhotoWriteResult = 'ok' | 'not-found' | 'forbidden';

/** Finds the exercise and checks that the user created it (system exercises never qualify). */
async function findOwnedExerciseId(
  userPublicId: string,
  exercisePublicId: string,
): Promise<{ id: bigint } | 'not-found' | 'forbidden'> {
  const exercise = await prisma.exercise.findUnique({
    where: { publicId: exercisePublicId },
    select: {
      id: true,
      isSystemDefined: true,
      createdByUser: { select: { publicId: true } },
    },
  });

  if (!exercise) {
    return 'not-found';
  }

  if (exercise.isSystemDefined || exercise.createdByUser?.publicId !== userPublicId) {
    return 'forbidden';
  }

  return { id: exercise.id };
}

export async function saveExercisePhoto(
  userPublicId: string,
  exercisePublicId: string,
  data: Buffer,
): Promise<PhotoWriteResult> {
  const owned = await findOwnedExerciseId(userPublicId, exercisePublicId);

  if (typeof owned === 'string') {
    return owned;
  }

  const bytes = new Uint8Array(data);
  await prisma.exercisePhoto.upsert({
    where: { exerciseId: owned.id },
    create: { exerciseId: owned.id, data: bytes },
    update: { data: bytes },
  });

  return 'ok';
}

export async function deleteExercisePhoto(
  userPublicId: string,
  exercisePublicId: string,
): Promise<PhotoWriteResult> {
  const owned = await findOwnedExerciseId(userPublicId, exercisePublicId);

  if (typeof owned === 'string') {
    return owned;
  }

  await prisma.exercisePhoto.deleteMany({ where: { exerciseId: owned.id } });

  return 'ok';
}
