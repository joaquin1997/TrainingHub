import type {
  ExerciseProgressDetail,
  ExerciseProgressPoint,
  ExerciseProgressSummary,
} from '@workout/domain';

import { prisma } from '../../infrastructure/prisma.js';
import {
  DEVELOPMENT_USER_PUBLIC_ID,
  ensureDevelopmentUser,
} from '../../infrastructure/developmentUser.js';

type ProgressAccumulator = {
  exerciseId: string;
  exerciseName: string;
  points: ExerciseProgressPoint[];
};

function maxDefined(values: Array<number | null | undefined>): number | undefined {
  const defined = values.filter((value): value is number => typeof value === 'number');
  return defined.length > 0 ? Math.max(...defined) : undefined;
}

async function loadSessions() {
  await ensureDevelopmentUser();

  return prisma.workoutSession.findMany({
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
}

function buildAccumulators(
  sessions: Awaited<ReturnType<typeof loadSessions>>,
): Map<string, ProgressAccumulator> {
  const byExercise = new Map<string, ProgressAccumulator>();

  for (const session of sessions) {
    const date = (session.completedAt ?? session.startedAt).toISOString();

    for (const exercise of session.exercises) {
      const key = exercise.exercise.publicId;
      const accumulator = byExercise.get(key) ?? {
        exerciseId: key,
        exerciseName: exercise.exercise.name,
        points: [],
      };

      accumulator.exerciseName = exercise.exercise.name;
      accumulator.points.push({
        date,
        bestWeightKg: maxDefined(exercise.sets.map((set) => set.weightKg)),
        bestReps: maxDefined(exercise.sets.map((set) => set.reps)),
        totalVolume: exercise.sets.reduce(
          (sum, set) => sum + (set.reps ?? 0) * (set.weightKg ?? 0),
          0,
        ),
      });

      byExercise.set(key, accumulator);
    }
  }

  return byExercise;
}

function toSummary(accumulator: ProgressAccumulator): ExerciseProgressSummary {
  const lastPoint = accumulator.points[accumulator.points.length - 1];

  return {
    exerciseId: accumulator.exerciseId,
    exerciseName: accumulator.exerciseName,
    sessionCount: accumulator.points.length,
    lastPerformedAt: lastPoint?.date,
    latestWeightKg: lastPoint?.bestWeightKg,
    latestReps: lastPoint?.bestReps,
    personalBestWeightKg: maxDefined(accumulator.points.map((point) => point.bestWeightKg)),
    personalBestReps: maxDefined(accumulator.points.map((point) => point.bestReps)),
  };
}

export async function listExerciseProgress(): Promise<ExerciseProgressSummary[]> {
  const sessions = await loadSessions();
  const accumulators = buildAccumulators(sessions);

  return [...accumulators.values()]
    .map(toSummary)
    .sort((left, right) =>
      (right.lastPerformedAt ?? '').localeCompare(left.lastPerformedAt ?? ''),
    );
}

export async function getExerciseProgress(
  exerciseId: string,
): Promise<ExerciseProgressDetail | null> {
  const sessions = await loadSessions();
  const accumulator = buildAccumulators(sessions).get(exerciseId);

  if (!accumulator) {
    return null;
  }

  return { ...toSummary(accumulator), points: accumulator.points };
}
