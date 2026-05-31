import type {
  ExerciseProgressDetail,
  ExerciseProgressPoint,
  ExerciseProgressSummary,
  WeeklyVolumePoint,
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

/** Epley estimated one-rep max for a single set, rounded to one decimal. */
function estimateOneRepMax(
  reps: number | null | undefined,
  weightKg: number | null | undefined,
): number | undefined {
  if (typeof reps !== 'number' || typeof weightKg !== 'number' || weightKg <= 0) {
    return undefined;
  }

  return Math.round(weightKg * (1 + reps / 30) * 10) / 10;
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
        estimatedOneRepMax: maxDefined(
          exercise.sets.map((set) => estimateOneRepMax(set.reps, set.weightKg)),
        ),
      });

      byExercise.set(exercise.exerciseId, accumulator);
    }
  }

  return byExercise;
}

function toSummary(accumulator: ProgressAccumulator): ExerciseProgressSummary {
  const { points } = accumulator;
  const lastPoint = points[points.length - 1];
  const priorBestWeight = maxDefined(
    points.slice(0, -1).map((point) => point.bestWeightKg),
  );
  const isRecordSession =
    lastPoint?.bestWeightKg !== undefined &&
    (priorBestWeight === undefined || lastPoint.bestWeightKg > priorBestWeight);

  return {
    exerciseId: accumulator.exerciseId,
    exerciseName: accumulator.exerciseName,
    sessionCount: points.length,
    lastPerformedAt: lastPoint?.date,
    latestWeightKg: lastPoint?.bestWeightKg,
    latestReps: lastPoint?.bestReps,
    personalBestWeightKg: maxDefined(points.map((point) => point.bestWeightKg)),
    personalBestReps: maxDefined(points.map((point) => point.bestReps)),
    bestEstimatedOneRepMax: maxDefined(
      points.map((point) => point.estimatedOneRepMax),
    ),
    isRecordSession,
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

/** Total volume (reps × weight) for one session across all its exercises. */
function sessionVolume(session: ProgressSessionInput): number {
  return session.exercises.reduce(
    (sum, exercise) =>
      sum +
      exercise.sets.reduce(
        (setSum, set) => setSum + (set.reps ?? 0) * (set.weightKg ?? 0),
        0,
      ),
    0,
  );
}

/** ISO date (YYYY-MM-DD) of the Monday that starts the week containing `iso`. */
function weekStartIso(iso: string): string {
  const date = new Date(iso);
  const daysSinceMonday = (date.getUTCDay() + 6) % 7;
  const monday = new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate() - daysSinceMonday,
    ),
  );

  return monday.toISOString().slice(0, 10);
}

/**
 * Bucket sessions into calendar weeks (Monday-start, UTC) and sum training
 * volume per week. Only weeks with at least one workout are returned; the most
 * recent `weeks` are kept, oldest-first for charting.
 */
export function buildWeeklyVolume(
  sessions: ProgressSessionInput[],
  weeks = 8,
): WeeklyVolumePoint[] {
  const byWeek = new Map<string, WeeklyVolumePoint>();

  for (const session of sessions) {
    const weekStart = weekStartIso(session.date);
    const bucket = byWeek.get(weekStart) ?? {
      weekStart,
      totalVolume: 0,
      workoutCount: 0,
    };

    bucket.totalVolume += sessionVolume(session);
    bucket.workoutCount += 1;
    byWeek.set(weekStart, bucket);
  }

  return [...byWeek.values()]
    .map((point) => ({
      ...point,
      totalVolume: Math.round(point.totalVolume),
    }))
    .sort((left, right) => left.weekStart.localeCompare(right.weekStart))
    .slice(-weeks);
}
