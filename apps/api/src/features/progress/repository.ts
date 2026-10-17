import { prisma } from '../../infrastructure/prisma.js';
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
import { buildStartingRecords } from './startingRecords.js';

async function loadSessionInputs(
  userPublicId: string,
): Promise<ProgressSessionInput[]> {
  const sessions = await prisma.workoutSession.findMany({
    where: { user: { publicId: userPublicId } },
    orderBy: { startedAt: 'asc' },
    include: {
      exercises: {
        include: {
          exercise: {
            select: { publicId: true, name: true, category: true, trackingType: true },
          },
          sets: true,
        },
      },
    },
  });

  const inputs = sessions.map((session) => ({
    date: (session.completedAt ?? session.startedAt).toISOString(),
    workoutId: session.publicId,
    clientId: session.clientId,
    exercises: session.exercises.map((exercise) => ({
      exerciseId: exercise.exercise.publicId,
      exerciseName: exercise.exercise.name,
      category: exercise.exercise.category,
      trackingType: toExerciseTrackingType(exercise.exercise.trackingType),
      sets: exercise.sets.map((set) => ({
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
