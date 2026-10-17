import { formatDayHeading, formatDuration } from '@/lib/format';
import { formatSetValues, sideLabels } from '@/lib/tracking';
import { formatWeightValue } from '@/lib/weight';

import type { ShareSet, ShareWorkoutInput } from './shareText';

/** The card shows at most this many records and exercises (spec 0034 FR-25). */
export const SHARE_CARD_MAX_RECORDS = 3;
export const SHARE_CARD_MAX_EXERCISES = 5;

type Translate = (key: string, options?: Record<string, unknown>) => string;

/** The same input as the text share (0028), with a translator that takes options. */
export type ShareCardInput = Omit<ShareWorkoutInput, 't'> & { t: Translate };

export interface ShareCardStat {
  key: 'duration' | 'volume' | 'sets';
  label: string;
  value: string;
  unit?: string;
}

/** What the share image shows — and nothing else (FR-25: no notes, no body data). */
export interface ShareCardModel {
  /** Routine name; absent for a saved session that does not carry it. */
  title?: string;
  date: string;
  stats: ShareCardStat[];
  records: { exerciseName: string; title: string; value: string }[];
  /** "+2 more" when there are more records than the card holds. */
  moreRecords?: string;
  /** In workout order, each with its best set already formatted. */
  exercises: { name: string; best: string }[];
  footer: string;
}

type Score = (set: ShareSet) => [number, number];

const positive = (value: number | null | undefined) => (value ?? 0) > 0;

/**
 * An exercise's best set: among its performed working sets (warm-ups only
 * when there is nothing else) — the longest distance, else the longest time,
 * else the heaviest weight then most reps, else the most reps. The first one
 * wins a tie. Null when nothing was performed.
 */
export function bestSet(sets: ShareSet[]): ShareSet | null {
  const performed = sets.filter((set) => set.performed);
  const working = performed.filter((set) => set.type !== 'warmup');
  const pool = working.length > 0 ? working : performed;
  if (pool.length === 0) {
    return null;
  }

  const score: Score = pool.some((set) => positive(set.distanceMeters))
    ? (set) => [set.distanceMeters ?? 0, set.durationSeconds ?? 0]
    : pool.some((set) => positive(set.durationSeconds))
      ? (set) => [set.durationSeconds ?? 0, set.weightKg ?? 0]
      : pool.some((set) => positive(set.weightKg))
        ? (set) => [set.weightKg ?? 0, set.reps ?? 0]
        : (set) => [set.reps ?? 0, 0];

  return pool.reduce((best, set) => {
    const [a, b] = score(set);
    const [bestA, bestB] = score(best);
    return a > bestA || (a === bestA && b > bestB) ? set : best;
  });
}

/** A best set in the display unit; a set with only reps reads "12 reps", not "– kg × 12". */
function formatBest(set: ShareSet, { unit, t }: ShareCardInput) {
  const repsOnly =
    !positive(set.weightKg) &&
    set.durationSeconds == null &&
    set.distanceMeters == null &&
    set.repsLeft == null &&
    set.repsRight == null;
  return repsOnly
    ? t('progress.records.repsValue', { count: set.reps ?? 0 })
    : formatSetValues(set, unit, sideLabels(t));
}

/**
 * The share card's content (spec 0034 FR-25): routine name, date, duration,
 * volume, sets done, up to three records and up to five exercises with their
 * best set — in the app's language and the display unit (weights stay kg
 * until formatted here, Article 4).
 */
export function buildShareCard(input: ShareCardInput): ShareCardModel {
  const { t, unit } = input;
  const setsDone = input.exercises.reduce(
    (count, exercise) => count + exercise.sets.filter((set) => set.performed).length,
    0,
  );

  const stats: ShareCardStat[] = [
    ...(input.durationSeconds === null
      ? []
      : [
          {
            key: 'duration' as const,
            label: t('workouts.share.duration'),
            value: formatDuration(input.durationSeconds),
          },
        ]),
    {
      key: 'volume',
      label: t('workouts.share.volume'),
      value: formatWeightValue(input.volumeKg, unit),
      unit,
    },
    { key: 'sets', label: t('workouts.setsLabel'), value: String(setsDone) },
  ];

  const records = input.records ?? [];
  const hidden = records.length - SHARE_CARD_MAX_RECORDS;

  const exercises: ShareCardModel['exercises'] = [];
  for (const exercise of input.exercises) {
    if (exercises.length === SHARE_CARD_MAX_EXERCISES) {
      break;
    }
    const best = bestSet(exercise.sets);
    if (best) {
      exercises.push({ name: exercise.name, best: formatBest(best, input) });
    }
  }

  return {
    title: input.title,
    date: formatDayHeading(input.when, input.language),
    stats,
    records: records.slice(0, SHARE_CARD_MAX_RECORDS),
    moreRecords: hidden > 0 ? t('workouts.share.moreRecords', { count: hidden }) : undefined,
    exercises,
    footer: t('workouts.share.cardFooter'),
  };
}
