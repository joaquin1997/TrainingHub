import type { ExerciseRecord, RecordType } from '@workout/domain';

import { recordReps } from '../workouts/sides.js';

/**
 * Personal records by type (spec 0023). Pure: the input is one exercise's
 * sessions, oldest first, each holding only its working sets (performed and
 * not warm-up — the caller applies spec 0013's rule). Records are derived on
 * every read, never stored.
 *
 * Each single-value type is one small function in `SINGLE_VALUE_RECORDS`.
 * Time and distance (spec 0021) are entries there too; the weight-based types
 * read only lifting sets (no time, no distance), so a carry's 24 kg is never a
 * weight record — its record is the longest time (FR-6).
 *
 * A unilateral set (spec 0022) holds `reps` = left + right: volumes read that
 * total, while reps, reps at weight and estimated 1RM read the better side.
 */

export type RecordSet = {
  reps?: number | null;
  repsLeft?: number | null;
  repsRight?: number | null;
  weightKg?: number | null;
  durationSeconds?: number | null;
  distanceMeters?: number | null;
};

/** A set measured by weight and reps, not by time or distance (spec 0021). */
function isLiftSet(set: RecordSet): boolean {
  return (
    (set.durationSeconds === undefined || set.durationSeconds === null) &&
    (set.distanceMeters === undefined || set.distanceMeters === null)
  );
}

/** One exercise in one session: when, and its working sets. */
export type ExerciseSessionWork = {
  date: string;
  sets: RecordSet[];
};

type RecordCandidate = { value: number; weightKg?: number; reps?: number };

type SingleValueRecord = (sets: RecordSet[]) => RecordCandidate | undefined;

/** How many of the heaviest weights get a "most reps at" best (spec assumption). */
export const REPS_AT_WEIGHT_TOP = 3;

/** Display order of the record types. */
const RECORD_ORDER: RecordType[] = [
  'heaviestWeight',
  'mostReps',
  'repsAtWeight',
  'bestSetVolume',
  'bestSessionVolume',
  'bestEstimatedOneRepMax',
  'longestTime',
  'longestDistance',
];

function positive(value: number | null | undefined): value is number {
  return typeof value === 'number' && value > 0;
}

/** Two decimals: enough for kg, and keeps float noise out of comparisons. */
function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Epley estimated one-rep max for a single set, rounded to one decimal. */
export function estimateOneRepMax(
  reps: number | null | undefined,
  weightKg: number | null | undefined,
): number | undefined {
  if (typeof reps !== 'number' || !positive(weightKg)) {
    return undefined;
  }

  return Math.round(weightKg * (1 + reps / 30) * 10) / 10;
}

/** The set with the highest score (the first one on a tie), as a candidate. */
function bestSet(
  sets: RecordSet[],
  score: (set: RecordSet) => number | undefined,
): RecordCandidate | undefined {
  let best: RecordCandidate | undefined;

  for (const set of sets) {
    const value = score(set);
    if (value !== undefined && (best === undefined || value > best.value)) {
      best = {
        value,
        weightKg: set.weightKg ?? undefined,
        reps: recordReps(set),
      };
    }
  }

  return best;
}

export const heaviestWeight: SingleValueRecord = (sets) =>
  bestSet(sets, (set) => (positive(set.weightKg) ? set.weightKg : undefined));

export const mostReps: SingleValueRecord = (sets) =>
  bestSet(sets, (set) => {
    const reps = recordReps(set);
    return positive(reps) ? reps : undefined;
  });

export const bestSetVolume: SingleValueRecord = (sets) =>
  bestSet(sets, (set) =>
    positive(set.weightKg) && positive(set.reps)
      ? round2(set.weightKg * set.reps)
      : undefined,
  );

export const bestSessionVolume: SingleValueRecord = (sets) => {
  const total = sets.reduce(
    (sum, set) =>
      positive(set.weightKg) && positive(set.reps) ? sum + set.weightKg * set.reps : sum,
    0,
  );

  return total > 0 ? { value: round2(total) } : undefined;
};

export const bestEstimatedOneRepMax: SingleValueRecord = (sets) =>
  bestSet(sets, (set) => estimateOneRepMax(recordReps(set), set.weightKg));

export const longestTime: SingleValueRecord = (sets) =>
  bestSet(sets, (set) => (positive(set.durationSeconds) ? set.durationSeconds : undefined));

export const longestDistance: SingleValueRecord = (sets) =>
  bestSet(sets, (set) => (positive(set.distanceMeters) ? set.distanceMeters : undefined));

/** Weight-based types read lifting sets only (see `isLiftSet`). */
const onLiftSets =
  (derive: SingleValueRecord): SingleValueRecord =>
  (sets) =>
    derive(sets.filter(isLiftSet));

export const SINGLE_VALUE_RECORDS: ReadonlyArray<readonly [RecordType, SingleValueRecord]> = [
  ['heaviestWeight', onLiftSets(heaviestWeight)],
  ['mostReps', onLiftSets(mostReps)],
  ['bestSetVolume', onLiftSets(bestSetVolume)],
  ['bestSessionVolume', onLiftSets(bestSessionVolume)],
  ['bestEstimatedOneRepMax', onLiftSets(bestEstimatedOneRepMax)],
  ['longestTime', longestTime],
  ['longestDistance', longestDistance],
];

/** Most reps done at each distinct weight in these sets. */
export function repsByWeight(sets: RecordSet[]): Map<number, number> {
  const byWeight = new Map<number, number>();

  for (const set of sets) {
    const reps = recordReps(set);
    if (positive(set.weightKg) && positive(reps)) {
      byWeight.set(set.weightKg, Math.max(byWeight.get(set.weightKg) ?? 0, reps));
    }
  }

  return byWeight;
}

/** Most reps any earlier set did at `weightKg` or heavier; undefined if none was. */
function repsAtOrAbove(
  earlier: Map<number, { reps: number; date: string }>,
  weightKg: number,
): number | undefined {
  let most: number | undefined;

  for (const [weight, best] of earlier) {
    if (weight >= weightKg && (most === undefined || best.reps > most)) {
      most = best.reps;
    }
  }

  return most;
}

/**
 * The heaviest weight at which this session did more reps than any earlier set
 * at that weight or heavier. A weight never reached before is left to
 * `heaviestWeight`; one hit per session keeps the summary short.
 */
function repsAtWeightHit(
  session: Map<number, number>,
  earlier: Map<number, { reps: number; date: string }>,
): { weightKg: number; reps: number } | undefined {
  const weights = [...session.keys()].sort((left, right) => right - left);

  for (const weightKg of weights) {
    const before = repsAtOrAbove(earlier, weightKg);
    const reps = session.get(weightKg)!;
    if (before !== undefined && reps > before) {
      return { weightKg, reps };
    }
  }

  return undefined;
}

function byRecordOrder(left: ExerciseRecord, right: ExerciseRecord): number {
  return RECORD_ORDER.indexOf(left.type) - RECORD_ORDER.indexOf(right.type);
}

export type ExerciseRecordHistory = {
  /** Current best of each type, then most reps at the heaviest weights. */
  bests: ExerciseRecord[];
  /** `hits[i]`: the records session `i` beat. Empty when it beat none. */
  hits: ExerciseRecord[][];
};

/**
 * Walks one exercise's sessions (oldest first). A session beats a type when
 * its value is strictly above the best of the sessions before it; where there
 * was no earlier value there was nothing to beat (EF-1). A best keeps the date
 * it was first reached.
 */
export function deriveExerciseRecords(
  sessions: ExerciseSessionWork[],
): ExerciseRecordHistory {
  const bests = new Map<RecordType, ExerciseRecord>();
  const repsAtWeight = new Map<number, { reps: number; date: string }>();
  const hits: ExerciseRecord[][] = [];

  for (const session of sessions) {
    const sessionHits: ExerciseRecord[] = [];

    for (const [type, derive] of SINGLE_VALUE_RECORDS) {
      const candidate = derive(session.sets);
      if (!candidate) {
        continue;
      }

      const previous = bests.get(type);
      if (previous && candidate.value <= previous.value) {
        continue;
      }

      const record: ExerciseRecord = { type, ...candidate, date: session.date };
      if (previous) {
        sessionHits.push(record);
      }
      bests.set(type, record);
    }

    const sessionReps = repsByWeight(session.sets.filter(isLiftSet));
    const hit = repsAtWeightHit(sessionReps, repsAtWeight);
    if (hit) {
      sessionHits.push({
        type: 'repsAtWeight',
        value: hit.reps,
        weightKg: hit.weightKg,
        date: session.date,
      });
    }

    for (const [weightKg, reps] of sessionReps) {
      const previous = repsAtWeight.get(weightKg);
      if (!previous || reps > previous.reps) {
        repsAtWeight.set(weightKg, { reps, date: session.date });
      }
    }

    hits.push(sessionHits.sort(byRecordOrder));
  }

  const heaviestWeights: ExerciseRecord[] = [...repsAtWeight.entries()]
    .sort(([left], [right]) => right - left)
    .slice(0, REPS_AT_WEIGHT_TOP)
    .map(([weightKg, best]) => ({
      type: 'repsAtWeight',
      value: best.reps,
      weightKg,
      date: best.date,
    }));

  return {
    bests: [...bests.values(), ...heaviestWeights].sort(byRecordOrder),
    hits,
  };
}
