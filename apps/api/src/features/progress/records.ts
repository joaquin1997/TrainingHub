import {
  estimateOneRepMax,
  isLiftSet,
  RECORD_TYPE_ORDER,
  recordReps,
  repsAtOrAbove as repsAtOrAboveEntries,
  repsAtWeightOf,
  sessionVolumeKg,
  SET_RECORD_VALUES,
  type ExerciseRecord,
  type RecordSetValues,
  type RecordType,
  type SetRecordType,
} from '@workout/domain';

/**
 * Personal records by type (spec 0023). Pure: the input is one exercise's
 * sessions, oldest first, each holding only its working sets (performed and
 * not warm-up — the caller applies spec 0013's rule). Records are derived on
 * every read, never stored.
 *
 * How one set scores for each type lives in `@workout/domain` (records.ts),
 * shared with the phone's live record badges (spec 0032): the weight-based
 * types read only lifting sets (no time, no distance — spec 0021), so a
 * carry's 24 kg is never a weight record; a unilateral set (spec 0022) reads
 * its better side for reps, reps at weight and estimated 1RM, and its
 * two-side total for volumes. This file walks the sessions and keeps the bests.
 */

export { estimateOneRepMax };

export type RecordSet = RecordSetValues;

/** One exercise in one session: when, and its working sets. */
export type ExerciseSessionWork = {
  date: string;
  sets: RecordSet[];
};

type RecordCandidate = { value: number; weightKg?: number; reps?: number };

type SingleValueRecord = (sets: RecordSet[]) => RecordCandidate | undefined;

/** How many of the heaviest weights get a "most reps at" best (spec assumption). */
export const REPS_AT_WEIGHT_TOP = 3;

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

/** The best set by the shared per-set score of `type`. */
const bySetValue =
  (type: SetRecordType): SingleValueRecord =>
  (sets) =>
    bestSet(sets, SET_RECORD_VALUES[type]);

export const heaviestWeight = bySetValue('heaviestWeight');
export const mostReps = bySetValue('mostReps');
export const bestSetVolume = bySetValue('bestSetVolume');
export const bestEstimatedOneRepMax = bySetValue('bestEstimatedOneRepMax');
export const longestTime = bySetValue('longestTime');
export const longestDistance = bySetValue('longestDistance');

export const bestSessionVolume: SingleValueRecord = (sets) => {
  const total = sessionVolumeKg(sets);
  return total === undefined ? undefined : { value: total };
};

/** Weight-based types read lifting sets only (the shared scores check it too). */
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
    const atWeight = repsAtWeightOf(set);
    if (atWeight) {
      byWeight.set(
        atWeight.weightKg,
        Math.max(byWeight.get(atWeight.weightKg) ?? 0, atWeight.reps),
      );
    }
  }

  return byWeight;
}

/** Most reps any earlier set did at `weightKg` or heavier; undefined if none was. */
function repsAtOrAbove(
  earlier: Map<number, { reps: number; date: string }>,
  weightKg: number,
): number | undefined {
  return repsAtOrAboveEntries(
    [...earlier].map(([weight, best]) => ({ weightKg: weight, reps: best.reps })),
    weightKg,
  );
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
  return RECORD_TYPE_ORDER.indexOf(left.type) - RECORD_TYPE_ORDER.indexOf(right.type);
}

export type ExerciseRecordHistory = {
  /** Current best of each type, then most reps at the heaviest weights. */
  bests: ExerciseRecord[];
  /** `hits[i]`: the records session `i` beat. Empty when it beat none. */
  hits: ExerciseRecord[][];
  /** Most reps ever done at every weight (kg → reps), for live badges (spec 0032). */
  repsAtEveryWeight: Map<number, number>;
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
    repsAtEveryWeight: new Map(
      [...repsAtWeight].map(([weightKg, best]) => [weightKg, best.reps]),
    ),
  };
}
