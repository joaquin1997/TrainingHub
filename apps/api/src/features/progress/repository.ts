import { prisma } from '../../infrastructure/prisma.js';
import { toExerciseTrackingType } from '../exercises/trackingTypes.js';
import {
  buildExerciseProgressDetail,
  buildExerciseProgressSummaries,
  buildMuscleGroupVolume,
  buildWeeklyVolume,
  selectPerformedWork,
  type ProgressSessionInput,
} from './aggregate.js';

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
    exercises: session.exercises.map((exercise) => ({
      exerciseId: exercise.exercise.publicId,
      exerciseName: exercise.exercise.name,
      category: exercise.exercise.category,
      trackingType: toExerciseTrackingType(exercise.exercise.trackingType),
      sets: exercise.sets.map((set) => ({
        reps: set.reps,
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
