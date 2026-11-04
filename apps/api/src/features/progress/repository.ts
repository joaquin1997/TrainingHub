import { prisma } from '../../infrastructure/prisma.js';
import { exerciseDisplayName } from '../../infrastructure/requestLanguage.js';
import { toExerciseTrackingType } from '../exercises/trackingTypes.js';
import {
  buildExerciseProgressDetail,
  buildExerciseProgressSummaries,
  buildMuscleGroupVolume,
  buildSessionRecords,
  buildWeeklyVolume,
  selectPerformedWork,
  type ProgressSessionInput,
} from './aggregate.js';
import { buildComparisonReferences } from './comparisonReferences.js';
import { buildStartingRecords } from './startingRecords.js';

async function loadSessionInputs(
  userPublicId: string,
): Promise<ProgressSessionInput[]> {
  const sessions = await prisma.workoutSession.findMany({
    where: { user: { publicId: userPublicId } },
    orderBy: { startedAt: 'asc' },
    include: {
      exercises: {
        orderBy: { order: 'asc' },
        include: {
          exercise: {
            select: {
              publicId: true,
              name: true,
              nameEs: true,
              nameEn: true,
              aliases: true,
              isSystemDefined: true,
              createdByUser: { select: { publicId: true } },
              category: true,
              trackingType: true,
            },
          },
          sets: { orderBy: { order: 'asc' } },
        },
      },
    },
  });

  const inputs = sessions.map((session) => ({
    startedAt: session.startedAt.toISOString(),
    date: (session.completedAt ?? session.startedAt).toISOString(),
    workoutId: session.publicId,
    clientId: session.clientId,
    exercises: session.exercises.map((exercise) => ({
      exerciseId: exercise.exercise.publicId,
      exerciseName: !exercise.exercise.isSystemDefined && exercise.exercise.createdByUser?.publicId !== userPublicId
        ? exercise.exercise.name : exerciseDisplayName(exercise.exercise),
      searchNames: exercise.exercise.isSystemDefined || exercise.exercise.createdByUser?.publicId === userPublicId
        ? [...new Set([exercise.exercise.name, exercise.exercise.nameEs, exercise.exercise.nameEn,
          ...(exercise.exercise.aliases ?? [])].filter((name): name is string => Boolean(name)))]
        : [exercise.exercise.name],
      category: exercise.exercise.category,
      trackingType: toExerciseTrackingType(exercise.exercise.trackingType),
      sets: exercise.sets.map((set) => ({
        workoutExerciseId: exercise.publicId,
        setId: set.publicId,
        exerciseOrder: exercise.order,
        setOrder: set.order,
        reps: set.reps,
        repsLeft: set.repsLeft,
        repsRight: set.repsRight,
        weightKg: set.weightKg,
        durationSeconds: set.durationSeconds,
        distanceMeters: set.distanceMeters,
        completedAt: set.completedAt,
        type: set.type,
        isWarmup: set.isWarmup,
      })),
    })),
  }));

  // Every builder reads only performed work (spec 0013).
  return selectPerformedWork(inputs);
}

export async function listExerciseProgress(userPublicId: string) {
  return buildExerciseProgressSummaries(await loadSessionInputs(userPublicId));
}

export async function getExerciseProgress(
  userPublicId: string,
  exerciseId: string,
) {
  return buildExerciseProgressDetail(
    await loadSessionInputs(userPublicId),
    exerciseId,
  );
}

export async function listWeeklyVolume(userPublicId: string) {
  return buildWeeklyVolume(await loadSessionInputs(userPublicId));
}

export async function listMuscleGroupVolume(userPublicId: string) {
  return buildMuscleGroupVolume(await loadSessionInputs(userPublicId));
}

export async function listSessionRecords(userPublicId: string) {
  return buildSessionRecords(await loadSessionInputs(userPublicId));
}

/** Starting records for the active workout's exercises (spec 0032). */
export async function listStartingRecords(userPublicId: string, exerciseIds: string[]) {
  return buildStartingRecords(await loadSessionInputs(userPublicId), exerciseIds);
}

/** Owned history plus catalog visibility, never arbitrary user identifiers. */
export async function listComparisonReferences(userPublicId: string, exerciseIds: string[], before: string) {
  const [sessions, visible] = await Promise.all([
    loadSessionInputs(userPublicId),
    prisma.exercise.findMany({ where: { publicId: { in: exerciseIds }, deletedAt: null, OR: [
      { isSystemDefined: true }, { createdByUser: { publicId: userPublicId } },
    ] }, select: { publicId: true } }),
  ]);
  const historyIds = sessions.flatMap((session) => session.exercises.map((exercise) => exercise.exerciseId));
  return buildComparisonReferences(sessions, exerciseIds, before, new Set([...visible.map((exercise) => exercise.publicId), ...historyIds]));
}
