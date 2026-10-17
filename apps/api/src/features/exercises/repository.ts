import { Prisma } from '@prisma/client';
import type { CreateExerciseInput, Exercise, MuscleGroup } from '@workout/domain';

import { prisma } from '../../infrastructure/prisma.js';
import { photoImageUrl } from './photo.js';
import { toExerciseTrackingType } from './trackingTypes.js';
import {
  classifyExerciseAccess,
  usableExerciseWhere,
  visibleExerciseWhere,
} from './visibility.js';

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
    isUnilateral: record.isUnilateral,
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

/** The catalog plus the person's own custom exercises (spec 0015 FR-1). */
export async function listExercises(userPublicId: string) {
  const exercises = await prisma.exercise.findMany({
    where: visibleExerciseWhere(userPublicId),
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

/** An exercise the person can see; someone else's custom one is `null`, like an unknown id (FR-2). */
export async function findExerciseById(userPublicId: string, id: string) {
  const exercise = await prisma.exercise.findFirst({
    include: exerciseInclude,
    where: { publicId: id, ...visibleExerciseWhere(userPublicId) },
  });

  return exercise ? mapExercise(exercise) : null;
}

/**
 * The exercises among `publicIds` the person may put in a routine: catalog,
 * own, or held — already in one of their routines or saved workouts (spec
 * 0015 FR-6, FR-7). Missing ids are not in the map.
 */
export async function findUsableExercises(
  userPublicId: string,
  publicIds: string[],
): Promise<Map<string, { id: string; name: string }>> {
  if (publicIds.length === 0) {
    return new Map();
  }

  const exercises = await prisma.exercise.findMany({
    where: { publicId: { in: [...new Set(publicIds)] }, ...usableExerciseWhere(userPublicId) },
    select: { publicId: true, name: true },
  });

  return new Map(
    exercises.map((exercise) => [
      exercise.publicId,
      { id: exercise.publicId, name: exercise.name },
    ]),
  );
}

export async function listFavoriteExerciseIds(
  userPublicId: string,
): Promise<string[]> {
  // Favourites of exercises the person can no longer see are hidden (FR-12).
  const favorites = await prisma.exerciseFavorite.findMany({
    where: {
      user: { publicId: userPublicId },
      exercise: visibleExerciseWhere(userPublicId),
    },
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
    prisma.exercise.findFirst({
      where: { publicId: exercisePublicId, ...visibleExerciseWhere(userPublicId) },
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

  // Same name (ignoring case) returns a catalog exercise or the person's own,
  // catalog first; someone else's never counts (spec 0015 FR-4, FR-5).
  const existingExercise = await prisma.exercise.findFirst({
    include: exerciseInclude,
    where: {
      name: {
        equals: input.name,
        mode: 'insensitive',
      },
      ...visibleExerciseWhere(userPublicId),
    },
    orderBy: [{ isSystemDefined: 'desc' }, { id: 'asc' }],
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
      isUnilateral: input.isUnilateral ?? false,
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

/** The photo of an exercise the person can see — in practice only the creator (FR-13). */
export async function findExercisePhoto(
  userPublicId: string,
  exercisePublicId: string,
): Promise<ExercisePhotoRecord | null> {
  const photo = await prisma.exercisePhoto.findFirst({
    where: {
      exercise: { publicId: exercisePublicId, ...visibleExerciseWhere(userPublicId) },
    },
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

/**
 * Finds the exercise as the person sees it (spec 0015): `null` when it does
 * not exist, is someone else's custom exercise, or was deleted (spec 0033) —
 * all answer "not found".
 */
async function findAccessibleExercise(userPublicId: string, exercisePublicId: string) {
  const exercise = await prisma.exercise.findUnique({
    where: { publicId: exercisePublicId },
    select: {
      id: true,
      isSystemDefined: true,
      deletedAt: true,
      createdByUser: { select: { publicId: true } },
    },
  });

  if (!exercise) {
    return null;
  }

  const access = classifyExerciseAccess(
    {
      isSystemDefined: exercise.isSystemDefined,
      creatorPublicId: exercise.createdByUser?.publicId,
      isDeleted: exercise.deletedAt !== null,
    },
    userPublicId,
  );

  return access === 'hidden' ? null : { id: exercise.id, access };
}

/** The person's own custom exercise; catalog ones exist but are not theirs to change. */
async function findOwnedExerciseId(
  userPublicId: string,
  exercisePublicId: string,
): Promise<{ id: bigint } | 'not-found' | 'forbidden'> {
  const exercise = await findAccessibleExercise(userPublicId, exercisePublicId);

  if (!exercise) {
    return 'not-found';
  }

  if (exercise.access !== 'own') {
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

export type UnilateralWriteResult = Exercise | 'not-found';

/**
 * Marks an exercise as done one side at a time, or not (spec 0022 FR-1).
 * Catalog exercises can be marked by anyone signed in — the flag is on the
 * exercise, shared by everyone on the server; a custom one only by its
 * creator. For anyone else a custom exercise does not exist (spec 0015
 * FR-14): `'not-found'`, never a "forbidden" that would reveal it.
 */
export async function setExerciseUnilateral(
  userPublicId: string,
  exercisePublicId: string,
  isUnilateral: boolean,
): Promise<UnilateralWriteResult> {
  const exercise = await findAccessibleExercise(userPublicId, exercisePublicId);

  if (!exercise) {
    return 'not-found';
  }

  const updated = await prisma.exercise.update({
    where: { id: exercise.id },
    data: { isUnilateral },
    include: exerciseInclude,
  });

  return mapExercise(updated);
}
