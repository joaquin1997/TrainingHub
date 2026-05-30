import { prisma } from '../../infrastructure/prisma.js';
import {
  DEVELOPMENT_USER_PUBLIC_ID,
  ensureDevelopmentUser,
} from '../../infrastructure/developmentUser.js';
import {
  buildExerciseProgressDetail,
  buildExerciseProgressSummaries,
  type ProgressSessionInput,
} from './aggregate.js';

async function loadSessionInputs(): Promise<ProgressSessionInput[]> {
  await ensureDevelopmentUser();

  const sessions = await prisma.workoutSession.findMany({
    where: { user: { publicId: DEVELOPMENT_USER_PUBLIC_ID } },
    orderBy: { startedAt: 'asc' },
    include: {
      exercises: {
        include: {
          exercise: { select: { publicId: true, name: true } },
          sets: true,
        },
      },
    },
  });

  return sessions.map((session) => ({
    date: (session.completedAt ?? session.startedAt).toISOString(),
    exercises: session.exercises.map((exercise) => ({
      exerciseId: exercise.exercise.publicId,
      exerciseName: exercise.exercise.name,
      sets: exercise.sets.map((set) => ({
        reps: set.reps,
        weightKg: set.weightKg,
      })),
    })),
  }));
}

export async function listExerciseProgress() {
  return buildExerciseProgressSummaries(await loadSessionInputs());
}

export async function getExerciseProgress(exerciseId: string) {
  return buildExerciseProgressDetail(await loadSessionInputs(), exerciseId);
}
