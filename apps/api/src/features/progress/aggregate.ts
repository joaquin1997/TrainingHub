import type {
  ExerciseTrackingType,
  ProgressSetEvidence,
  ExerciseProgressDetail,
  ExerciseProgressPoint,
  ExerciseProgressSummary,
  MuscleGroupVolumePoint,
  SessionRecord,
  SessionRecords,
  WeeklyVolumePoint,
} from '@workout/domain';

import {
  isLegacySession,
  isPerformedSet,
  isWarmupSet,
} from '../workouts/performedSets.js';
import {
  deriveExerciseRecords,
  estimateOneRepMax,
  type ExerciseRecordHistory,
  type RecordSet,
} from './records.js';
import { recordReps } from '../workouts/sides.js';

type ProgressSetInput = Pick<ProgressSetEvidence, 'workoutExerciseId' | 'setId' | 'exerciseOrder' | 'setOrder'> & {
  /** For a unilateral set, left + right (spec 0022): volume reads it as is. */
  reps?: number | null;
  repsLeft?: number | null;
  repsRight?: number | null;
  weightKg?: number | null;
  durationSeconds?: number | null;
  distanceMeters?: number | null;
  completedAt?: Date | string | null;
  type?: string | null;
  isWarmup?: boolean | null;
};

/**
 * Framework-agnostic input shape for progress aggregation, so the pure logic
 * can be unit tested without Prisma.
 */
export type ProgressSessionInput = {
  date: string;
  /** The workout's public id; needed only to list the records it beat. */
  workoutId?: string;
  clientId?: string | null;
  exercises: Array<{
    exerciseId: string;
    exerciseName: string;
    searchNames?: string[];
    category?: string | null;
    /** The exercise's current tracking type; absent = weight & reps. */
    trackingType?: ExerciseTrackingType;
    sets: ProgressSetInput[];
  }>;
};

/**
 * Keeps only performed work (spec 0013): sets marked done, or every set of a
 * legacy session. Exercise entries left with no performed set are dropped, so
 * they add no empty point. Call once, before any of the builders below.
 */
export function selectPerformedWork(
  sessions: ProgressSessionInput[],
): ProgressSessionInput[] {
  return sessions.map((session) => {
    const legacy = isLegacySession(
      session.exercises.flatMap((exercise) => exercise.sets),
    );

    return {
      ...session,
      exercises: session.exercises
        .map((exercise) => ({
          ...exercise,
          sets: exercise.sets.filter((set) => isPerformedSet(set, legacy)),
        }))
        .filter((exercise) => exercise.sets.length > 0),
    };
  });
}

type ProgressAccumulator = {
  exerciseId: string;
  exerciseName: string;
  trackingType?: ExerciseTrackingType;
  searchNames?: string[];
  points: ExerciseProgressPoint[];
  /**
   * `pointSessions[i]`: index of point `i`'s workout in the chronological
   * session list. Internal, never sent: it lets the detail flag record points.
   */
  pointSessions: number[];
};

function maxDefined(values: Array<number | null | undefined>): number | undefined {
  const defined = values.filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  return defined.length > 0 ? Math.max(...defined) : undefined;
}

function buildAccumulators(
  ordered: ProgressSessionInput[],
): Map<string, ProgressAccumulator> {
  const byExercise = new Map<string, ProgressAccumulator>();

  ordered.forEach((session, sessionIndex) => {
    // One saved workout is one point, even with repeated exercise occurrences.
    const grouped = new Map<string, ProgressSessionInput['exercises'][number]>();
    for (const exercise of session.exercises) {
      const previous = grouped.get(exercise.exerciseId);
      grouped.set(exercise.exerciseId, previous
        ? { ...previous, sets: [...previous.sets, ...exercise.sets] }
        : { ...exercise, sets: [...exercise.sets] });
    }
    for (const exercise of grouped.values()) {
      const accumulator = byExercise.get(exercise.exerciseId) ?? {
        exerciseId: exercise.exerciseId,
        exerciseName: exercise.exerciseName,
        points: [],
        pointSessions: [],
      };
      const workingSets = exercise.sets.filter((set) => !isWarmupSet(set));
      const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
      const heaviest = workingSets.filter((set) => finite(set.weightKg)).slice().sort((a, b) =>
        b.weightKg! - a.weightKg! || (recordReps(b) ?? -1) - (recordReps(a) ?? -1) ||
        (a.exerciseOrder ?? 0) - (b.exerciseOrder ?? 0) || (a.setOrder ?? 0) - (b.setOrder ?? 0),
      )[0];
      const evidence: ProgressSetEvidence | undefined = heaviest ? {
        workoutExerciseId: heaviest.workoutExerciseId,
        setId: heaviest.setId,
        exerciseOrder: heaviest.exerciseOrder,
        setOrder: heaviest.setOrder,
        weightKg: heaviest.weightKg ?? undefined,
        reps: heaviest.reps ?? undefined,
        repsLeft: heaviest.repsLeft ?? undefined,
        repsRight: heaviest.repsRight ?? undefined,
        durationSeconds: heaviest.durationSeconds ?? undefined,
        distanceMeters: heaviest.distanceMeters ?? undefined,
      } : undefined;
      const reps = workingSets.filter((set) => finite(set.reps));
      const weighted = exercise.sets.filter((set) => finite(set.weightKg) && finite(set.reps));
      accumulator.exerciseName = exercise.exerciseName;
      accumulator.searchNames = exercise.searchNames;
      accumulator.trackingType = exercise.trackingType;
      accumulator.points.push({
        date: session.date,
        workoutId: session.workoutId,
        heaviestWorkingSet: evidence,
        bestWeightKg: maxDefined(workingSets.map((set) => set.weightKg)),
        bestReps: maxDefined(workingSets.map(recordReps)),
        totalWorkingReps: reps.length ? reps.reduce((sum, set) => sum + set.reps!, 0) : undefined,
        sessionVolumeKg: weighted.length ? weighted.reduce((sum, set) => sum + set.weightKg! * set.reps!, 0) : undefined,
        totalVolume: exercise.sets.reduce((sum, set) => sum + (set.reps ?? 0) * (set.weightKg ?? 0), 0),
        estimatedOneRepMax: maxDefined(workingSets.filter((set) =>
          set.durationSeconds == null && set.distanceMeters == null,
        ).map((set) => estimateOneRepMax(recordReps(set), set.weightKg))),
        bestDurationSeconds: maxDefined(workingSets.map((set) => set.durationSeconds)),
        bestDistanceMeters: maxDefined(workingSets.map((set) => set.distanceMeters)),
      });
      accumulator.pointSessions.push(sessionIndex);
      byExercise.set(exercise.exerciseId, accumulator);
    }
  });

  return byExercise;
}

type ExerciseRecordSessions = {
  /** Index into the chronological session list, one per session (entries merged). */
  sessionIndexes: number[];
  history: ExerciseRecordHistory;
};

function chronological(sessions: ProgressSessionInput[]): ProgressSessionInput[] {
  return sessions
    .slice()
    .sort((left, right) => left.date.localeCompare(right.date) ||
      (left.workoutId ?? '').localeCompare(right.workoutId ?? ''));
}

/**
 * A set reduced to the values its exercise's tracking type records (spec
 * 0030 FR-17): after a reclassification, records read only the new type's
 * values, so an old "0 kg × 60" plank set gives no record once the plank is
 * timed. Without a known type the set is read as it is.
 */
export function recordValuesOf(
  set: ProgressSetInput,
  trackingType: ExerciseTrackingType | undefined,
): RecordSet {
  switch (trackingType) {
    case undefined:
      return set;
    case 'weight_reps':
      return {
        weightKg: set.weightKg,
        reps: set.reps,
        repsLeft: set.repsLeft,
        repsRight: set.repsRight,
      };
    case 'reps':
      return { reps: set.reps, repsLeft: set.repsLeft, repsRight: set.repsRight };
    case 'duration':
      return { durationSeconds: set.durationSeconds };
    case 'weight_duration':
      return { weightKg: set.weightKg, durationSeconds: set.durationSeconds };
    case 'distance_duration':
      return { distanceMeters: set.distanceMeters, durationSeconds: set.durationSeconds };
  }
}

/**
 * Records per exercise (spec 0023), from working sets only: warmups never
 * count. An exercise logged twice in one workout is one session here. Sets
 * are read through the exercise's current tracking type (spec 0030).
 */
export function buildRecordHistories(
  ordered: ProgressSessionInput[],
): Map<string, ExerciseRecordSessions> {
  const work = new Map<
    string,
    { sessionIndexes: number[]; sessions: Array<{ date: string; sets: RecordSet[] }> }
  >();

  ordered.forEach((session, sessionIndex) => {
    for (const exercise of session.exercises) {
      const entry = work.get(exercise.exerciseId) ?? { sessionIndexes: [], sessions: [] };
      const workingSets = exercise.sets
        .filter((set) => !isWarmupSet(set))
        .map((set) => recordValuesOf(set, exercise.trackingType));
      const last = entry.sessions.length - 1;

      if (entry.sessionIndexes[last] === sessionIndex) {
        entry.sessions[last]!.sets.push(...workingSets);
      } else {
        entry.sessionIndexes.push(sessionIndex);
        entry.sessions.push({ date: session.date, sets: [...workingSets] });
      }

      work.set(exercise.exerciseId, entry);
    }
  });

  return new Map(
    [...work.entries()].map(([exerciseId, entry]) => [
      exerciseId,
      {
        sessionIndexes: entry.sessionIndexes,
        history: deriveExerciseRecords(entry.sessions),
      },
    ]),
  );
}

function toSummary(
  accumulator: ProgressAccumulator,
  records: ExerciseRecordSessions | undefined,
): ExerciseProgressSummary {
  const { points } = accumulator;
  const lastPoint = points[points.length - 1];
  const lastHits = records?.history.hits[records.history.hits.length - 1] ?? [];
  const isRecordSession = lastHits.length > 0;

  return {
    exerciseId: accumulator.exerciseId,
    exerciseName: accumulator.exerciseName,
    searchNames: accumulator.searchNames,
    sessionCount: points.length,
    lastPerformedAt: lastPoint?.date,
    latestWeightKg: lastPoint?.bestWeightKg,
    latestReps: lastPoint?.heaviestWorkingSet
      ? recordReps(lastPoint.heaviestWorkingSet) : lastPoint?.bestReps,
    personalBestWeightKg: maxDefined(points.map((point) => point.bestWeightKg)),
    personalBestReps: maxDefined(points.map((point) => point.bestReps)),
    bestEstimatedOneRepMax: maxDefined(
      points.map((point) => point.estimatedOneRepMax),
    ),
    trackingType: accumulator.trackingType,
    latestDurationSeconds: lastPoint?.bestDurationSeconds,
    latestDistanceMeters: lastPoint?.bestDistanceMeters,
    personalBestDurationSeconds: maxDefined(
      points.map((point) => point.bestDurationSeconds),
    ),
    personalBestDistanceMeters: maxDefined(
      points.map((point) => point.bestDistanceMeters),
    ),
    isRecordSession,
  };
}

export function buildExerciseProgressSummaries(
  sessions: ProgressSessionInput[],
): ExerciseProgressSummary[] {
  const ordered = chronological(sessions);
  const records = buildRecordHistories(ordered);

  return [...buildAccumulators(ordered).values()]
    .map((accumulator) => toSummary(accumulator, records.get(accumulator.exerciseId)))
    .sort((left, right) =>
      (right.lastPerformedAt ?? '').localeCompare(left.lastPerformedAt ?? ''),
    );
}

/**
 * Marks the points whose workout beat at least one of the exercise's records
 * (spec 0034 FR-22, any record type, as `isRecordSession`). Records are per
 * workout, so repeated occurrences share a single combined flagged point.
 * The flag is present only when true.
 */
function flagRecordPoints(
  accumulator: ProgressAccumulator,
  records: ExerciseRecordSessions | undefined,
): ExerciseProgressPoint[] {
  if (!records) {
    return accumulator.points;
  }

  return accumulator.points.map((point, index) => {
    const position = records.sessionIndexes.indexOf(accumulator.pointSessions[index]!);
    const hits = position >= 0 ? records.history.hits[position] ?? [] : [];
    return hits.length > 0 ? { ...point, isRecord: true as const } : point;
  });
}

export function buildExerciseProgressDetail(
  sessions: ProgressSessionInput[],
  exerciseId: string,
): ExerciseProgressDetail | null {
  const ordered = chronological(sessions);
  const accumulator = buildAccumulators(ordered).get(exerciseId);

  if (!accumulator) {
    return null;
  }

  const records = buildRecordHistories(ordered).get(exerciseId);

  return {
    ...toSummary(accumulator, records),
    readableProgressVersion: 1,
    points: flagRecordPoints(accumulator, records),
    records: records?.history.bests ?? [],
  };
}

/**
 * The records each workout beat (spec 0023), newest workout first. Workouts
 * that beat none, or carry no id, are left out.
 */
export function buildSessionRecords(
  sessions: ProgressSessionInput[],
): SessionRecords[] {
  const ordered = chronological(sessions);
  const histories = buildRecordHistories(ordered);
  const hitsBySession = new Map<number, Map<string, SessionRecord[]>>();

  for (const [exerciseId, { sessionIndexes, history }] of histories) {
    sessionIndexes.forEach((sessionIndex, position) => {
      const hits = history.hits[position] ?? [];
      if (hits.length === 0) {
        return;
      }

      const exerciseName =
        ordered[sessionIndex]!.exercises.find((exercise) => exercise.exerciseId === exerciseId)
          ?.exerciseName ?? '';
      const byExercise = hitsBySession.get(sessionIndex) ?? new Map();
      byExercise.set(
        exerciseId,
        hits.map((hit) => ({ ...hit, exerciseId, exerciseName })),
      );
      hitsBySession.set(sessionIndex, byExercise);
    });
  }

  const result: SessionRecords[] = [];

  ordered.forEach((session, sessionIndex) => {
    const byExercise = hitsBySession.get(sessionIndex);
    if (!byExercise || !session.workoutId) {
      return;
    }

    // In the order the exercises were done in the workout.
    const exerciseIds = [...new Set(session.exercises.map((exercise) => exercise.exerciseId))];
    result.push({
      workoutId: session.workoutId,
      ...(session.clientId ? { clientId: session.clientId } : {}),
      records: exerciseIds.flatMap((exerciseId) => byExercise.get(exerciseId) ?? []),
    });
  });

  return result.reverse();
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

/**
 * Sums training volume by exercise category (the muscle-group proxy in the
 * catalog), highest first. Exercises with no category fall under "Other";
 * groups with zero volume are dropped.
 */
export function buildMuscleGroupVolume(
  sessions: ProgressSessionInput[],
): MuscleGroupVolumePoint[] {
  const byGroup = new Map<string, number>();

  for (const session of sessions) {
    for (const exercise of session.exercises) {
      const group = exercise.category?.trim() || 'Other';
      const volume = exercise.sets.reduce(
        (sum, set) => sum + (set.reps ?? 0) * (set.weightKg ?? 0),
        0,
      );

      if (volume > 0) {
        byGroup.set(group, (byGroup.get(group) ?? 0) + volume);
      }
    }
  }

  return [...byGroup.entries()]
    .map(([group, totalVolume]) => ({ group, totalVolume: Math.round(totalVolume) }))
    .sort((left, right) => right.totalVolume - left.totalVolume);
}
