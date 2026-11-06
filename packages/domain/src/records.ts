/**
 * The per-set rules of personal records (specs 0013, 0021, 0022, 0023), shared
 * by the API — which derives records from saved workouts — and the phone,
 * which announces record badges while logging (spec 0032). One copy, so the
 * phone and the server agree on what beats what.
 *
 * Pure, framework-free. Keep every relative import here `import type`: the
 * mobile app bundles this file on its own through the `@workout/domain/records`
 * path, and Metro cannot resolve the `.js` specifiers of the package index.
 */
import type { ExerciseRecord, RecordType } from './entities.js';

/** The fields of a performed set that records read. Weight in kg. */
export type RecordSetValues = {
  /** For a unilateral set, left + right (spec 0022). */
  reps?: number | null;
  repsLeft?: number | null;
  repsRight?: number | null;
  weightKg?: number | null;
  durationSeconds?: number | null;
  distanceMeters?: number | null;
};

/** The record types one set can reach on its own. */
export type SetRecordType = Exclude<RecordType, 'repsAtWeight' | 'bestSessionVolume'>;

/** The record types with a single best value (all but reps at a weight). */
export type StartingRecordType = Exclude<RecordType, 'repsAtWeight'>;

/**
 * An exercise's bests as they stood when it entered the active workout (spec
 * 0032 "starting records"). Derived from saved workouts; never changed by the
 * workout in progress. Weights and volumes in kg.
 */
export interface StartingRecords {
  exerciseId: string;
  /** Best value of each type; a type with no value had nothing to beat (FR-8). */
  bests: Partial<Record<StartingRecordType, number>>;
  /** Most reps done at every weight ever lifted (FR-1), any order. */
  repsAtWeight: Array<{ weightKg: number; reps: number }>;
}

/** A record a set (or an exercise's running volume) beats in the active workout. */
export type LiveRecordHit = Omit<ExerciseRecord, 'date'>;

/** Display order of the record types (spec 0023). */
export const RECORD_TYPE_ORDER: readonly RecordType[] = [
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
export function roundRecordValue(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Reps for records and estimated 1RM: the better side of a set with sides. */
export function recordReps(set: RecordSetValues): number | undefined {
  if (set.repsLeft == null && set.repsRight == null) {
    return set.reps ?? undefined;
  }

  return Math.max(set.repsLeft ?? 0, set.repsRight ?? 0);
}

/**
 * A set measured by weight and reps, not by time or distance (spec 0021). The
 * weight-based types read only these, so a carry's 24 kg is never a weight
 * record.
 */
export function isLiftSet(set: RecordSetValues): boolean {
  return set.durationSeconds == null && set.distanceMeters == null;
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

/** Weight × reps of a lifting set (both sides of a unilateral one), unrounded. */
export function setVolumeKg(set: RecordSetValues): number | undefined {
  return isLiftSet(set) && positive(set.weightKg) && positive(set.reps)
    ? set.weightKg * set.reps
    : undefined;
}

const onLiftSet =
  (score: (set: RecordSetValues) => number | undefined) =>
  (set: RecordSetValues): number | undefined =>
    isLiftSet(set) ? score(set) : undefined;

/** The value one set scores for each per-set record type; undefined = none. */
export const SET_RECORD_VALUES: Readonly<
  Record<SetRecordType, (set: RecordSetValues) => number | undefined>
> = {
  heaviestWeight: onLiftSet((set) => (positive(set.weightKg) ? set.weightKg : undefined)),
  mostReps: onLiftSet((set) => {
    const reps = recordReps(set);
    return positive(reps) ? reps : undefined;
  }),
  bestSetVolume: (set) => {
    const volume = setVolumeKg(set);
    return volume === undefined ? undefined : roundRecordValue(volume);
  },
  bestEstimatedOneRepMax: onLiftSet((set) =>
    estimateOneRepMax(recordReps(set), set.weightKg),
  ),
  longestTime: (set) => (positive(set.durationSeconds) ? set.durationSeconds : undefined),
  longestDistance: (set) => (positive(set.distanceMeters) ? set.distanceMeters : undefined),
};

/** The weight and better-side reps a lifting set counts for "most reps at". */
export function repsAtWeightOf(
  set: RecordSetValues,
): { weightKg: number; reps: number } | undefined {
  const reps = recordReps(set);
  return isLiftSet(set) && positive(set.weightKg) && positive(reps)
    ? { weightKg: set.weightKg, reps }
    : undefined;
}

/**
 * Most reps any entry did at `weightKg` or heavier; undefined when no entry
 * reached that weight — then it is a heaviest-weight question, not this one.
 */
export function repsAtOrAbove(
  entries: Iterable<{ weightKg: number; reps: number }>,
  weightKg: number,
): number | undefined {
  let most: number | undefined;

  for (const entry of entries) {
    if (entry.weightKg >= weightKg && (most === undefined || entry.reps > most)) {
      most = entry.reps;
    }
  }

  return most;
}

function byRecordOrder(left: LiveRecordHit, right: LiveRecordHit): number {
  return RECORD_TYPE_ORDER.indexOf(left.type) - RECORD_TYPE_ORDER.indexOf(right.type);
}

const SET_RECORD_TYPES = Object.keys(SET_RECORD_VALUES) as SetRecordType[];

/**
 * The starting records one performed working set beats (spec 0032 FR-7 –
 * FR-11), in display order. Strictly greater only; a type with no starting
 * value is never beaten. Judged on this set alone (FR-12). The caller passes
 * only performed, non-warm-up sets.
 */
export function setRecordHits(
  set: RecordSetValues,
  starting: StartingRecords,
): LiveRecordHit[] {
  const hits: LiveRecordHit[] = [];
  const weightKg = positive(set.weightKg) ? set.weightKg : undefined;
  const reps = recordReps(set);

  for (const type of SET_RECORD_TYPES) {
    const value = SET_RECORD_VALUES[type](set);
    const best = starting.bests[type];
    if (value !== undefined && best !== undefined && value > best) {
      hits.push({ type, value, weightKg, reps: positive(reps) ? reps : undefined });
    }
  }

  const atWeight = repsAtWeightOf(set);
  if (atWeight) {
    const before = repsAtOrAbove(starting.repsAtWeight, atWeight.weightKg);
    if (before !== undefined && atWeight.reps > before) {
      hits.push({ type: 'repsAtWeight', value: atWeight.reps, weightKg: atWeight.weightKg });
    }
  }

  return hits.sort(byRecordOrder);
}

/** Total volume of these sets (kg), two decimals; undefined when none lifts. */
export function sessionVolumeKg(sets: Iterable<RecordSetValues>): number | undefined {
  let total = 0;
  for (const set of sets) {
    total += setVolumeKg(set) ?? 0;
  }
  return total > 0 ? roundRecordValue(total) : undefined;
}

/**
 * The session-volume record of an exercise's performed working sets in the
 * active workout (spec 0032 FR-14): strictly above the starting best.
 */
export function sessionVolumeHit(
  sets: Iterable<RecordSetValues>,
  starting: StartingRecords,
): LiveRecordHit | undefined {
  const total = sessionVolumeKg(sets);
  const best = starting.bests.bestSessionVolume;
  return total !== undefined && best !== undefined && total > best
    ? { type: 'bestSessionVolume', value: total }
    : undefined;
}

/** Independently readable comparison sources (0048); unavailable is never empty. */
export type ComparisonSource<T> = { status: 'ready'; value: T } | { status: 'unavailable' };
export interface LastSessionReference {
  sessionId: string;
  date: string;
  records: StartingRecords;
}
export interface ExerciseComparisonReference {
  exerciseId: string;
  historical: ComparisonSource<StartingRecords>;
  lastSession: ComparisonSource<LastSessionReference | null>;
}
export type RecordComparisonHit = LiveRecordHit & {
  baselineValue: number;
  baselineScope: 'historical' | 'lastSession';
  referenceDate?: string;
  referenceSessionId?: string;
  lastSessionValue?: number;
};

/** Read a metric in its declared scope: historical reps includes heavier loads. */
export function comparisonBaseline(hit: LiveRecordHit, records: StartingRecords, exactWeight = false): number | undefined {
  if (hit.type !== 'repsAtWeight') return records.bests[hit.type];
  if (hit.weightKg === undefined) return undefined;
  return exactWeight
    ? records.repsAtWeight.find((entry) => entry.weightKg === hit.weightKg)?.reps
    : repsAtOrAbove(records.repsAtWeight, hit.weightKg);
}

/** Best working-set metrics of one exercise session; never combine independent maxima. */
export function recordsFromSets(exerciseId: string, sets: RecordSetValues[]): StartingRecords {
  const bests: StartingRecords['bests'] = {};
  const weights = new Map<number, number>();
  for (const set of sets) {
    for (const type of SET_RECORD_TYPES) {
      const value = SET_RECORD_VALUES[type](set);
      if (value !== undefined && (bests[type] === undefined || value > bests[type]!)) bests[type] = value;
    }
    const pair = repsAtWeightOf(set);
    if (pair) weights.set(pair.weightKg, Math.max(weights.get(pair.weightKg) ?? 0, pair.reps));
  }
  const volume = sessionVolumeKg(sets);
  if (volume !== undefined) bests.bestSessionVolume = volume;
  return { exerciseId, bests, repsAtWeight: [...weights].map(([weightKg, reps]) => ({ weightKg, reps })) };
}

/** Historic hits take priority; a last-session-only improvement is never a PR. */
export function comparisonHits(
  candidates: LiveRecordHit[],
  historical?: StartingRecords,
  last?: LastSessionReference | null,
): RecordComparisonHit[] {
  return candidates.flatMap<RecordComparisonHit>((hit) => {
    const historic = historical ? comparisonBaseline(hit, historical) : undefined;
    const previous = last ? comparisonBaseline(hit, last.records, true) : undefined;
    const scope = historic !== undefined && hit.value > historic ? 'historical'
      : previous !== undefined && hit.value > previous ? 'lastSession' : undefined;
    if (!scope) return [];
    return [{ ...hit, baselineScope: scope, baselineValue: scope === 'historical' ? historic! : previous!,
      referenceDate: last?.date, referenceSessionId: last?.sessionId, lastSessionValue: previous }];
  }).sort((a, b) => (a.baselineScope === b.baselineScope ? 0 : a.baselineScope === 'historical' ? -1 : 1) || byRecordOrder(a, b));
}

/** Candidates include metrics without a known baseline, to allow independent sources. */
export function setComparisonHits(set: RecordSetValues, historical?: StartingRecords, last?: LastSessionReference | null): RecordComparisonHit[] {
  const candidates: LiveRecordHit[] = SET_RECORD_TYPES.flatMap((type) => {
    const value = SET_RECORD_VALUES[type](set);
    return value === undefined ? [] : [{ type, value, weightKg: set.weightKg ?? undefined }];
  });
  const pair = repsAtWeightOf(set);
  if (pair) candidates.push({ type: 'repsAtWeight', value: pair.reps, weightKg: pair.weightKg });
  return comparisonHits(candidates, historical, last);
}

/** Validate persisted/network references before they can become comparison baselines. */
export function isStartingRecords(value: unknown, exerciseId?: string): value is StartingRecords {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const record = value as StartingRecords;
  const validNumber = (n: unknown) => typeof n === 'number' && Number.isFinite(n) && n > 0;
  return typeof record.exerciseId === 'string' && (!exerciseId || record.exerciseId === exerciseId) &&
    !!record.bests && typeof record.bests === 'object' && !Array.isArray(record.bests) &&
    Object.entries(record.bests).every(([type, n]) => RECORD_TYPE_ORDER.includes(type as RecordType) && type !== 'repsAtWeight' && validNumber(n)) &&
    Array.isArray(record.repsAtWeight) && record.repsAtWeight.every((entry) => entry && validNumber(entry.weightKg) && validNumber(entry.reps));
}
export function isLastSessionReference(value: unknown, exerciseId: string, before: string): value is LastSessionReference | null {
  if (value === null) return true;
  if (!value || typeof value !== 'object') return false;
  const last = value as LastSessionReference;
  return typeof last.sessionId === 'string' && last.sessionId.length > 0 &&
    typeof last.date === 'string' && Number.isFinite(Date.parse(last.date)) && Date.parse(last.date) < Date.parse(before) &&
    isStartingRecords(last.records, exerciseId);
}
