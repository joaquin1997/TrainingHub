import type {
  ExerciseProgressDetail,
  ExerciseProgressPoint,
  ExerciseProgressSummary,
} from '@workout/domain';

/**
 * Framework-agnostic input shape for progress aggregation, so the pure logic
 * can be unit tested without Prisma.
 */
export type ProgressSessionInput = {
  date: string;
  exercises: Array<{
    exerciseId: string;
    exerciseName: string;
    sets: Array<{ reps?: number | null; weightKg?: number | null }>;
  }>;
};

type ProgressAccumulator = {
  exerciseId: string;
  exerciseName: string;
  points: ExerciseProgressPoint[];
};

function maxDefined(values: Array<number | null | undefined>): number | undefined {
  const defined = values.filter((value): value is number => typeof value === 'number');
  return defined.length > 0 ? Math.max(...defined) : undefined;
}

function buildAccumulators(
  sessions: ProgressSessionInput[],
): Map<string, ProgressAccumulator> {
  const byExercise = new Map<string, ProgressAccumulator>();
  const chronological = sessions
    .slice()
    .sort((left, right) => left.date.localeCompare(right.date));

  for (const session of chronological) {
    for (const exercise of session.exercises) {
      const accumulator = byExercise.get(exercise.exerciseId) ?? {
        exerciseId: exercise.exerciseId,
        exerciseName: exercise.exerciseName,
        points: [],
      };

      accumulator.exerciseName = exercise.exerciseName;
      accumulator.points.push({
        date: session.date,
        bestWeightKg: maxDefined(exercise.sets.map((set) => set.weightKg)),
        bestReps: maxDefined(exercise.sets.map((set) => set.reps)),
        totalVolume: exercise.sets.reduce(
          (sum, set) => sum + (set.reps ?? 0) * (set.weightKg ?? 0),
          0,
        ),
      });

      byExercise.set(exercise.exerciseId, accumulator);
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

export function buildExerciseProgressSummaries(
  sessions: ProgressSessionInput[],
): ExerciseProgressSummary[] {
  return [...buildAccumulators(sessions).values()]
    .map(toSummary)
    .sort((left, right) =>
      (right.lastPerformedAt ?? '').localeCompare(left.lastPerformedAt ?? ''),
    );
}

export function buildExerciseProgressDetail(
  sessions: ProgressSessionInput[],
  exerciseId: string,
): ExerciseProgressDetail | null {
  const accumulator = buildAccumulators(sessions).get(exerciseId);

  if (!accumulator) {
    return null;
  }

  return { ...toSummary(accumulator), points: accumulator.points };
}
