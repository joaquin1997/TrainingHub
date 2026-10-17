import type { ExerciseProgressPoint, WeeklyVolumePoint } from '@workout/domain';

/** Numeric metrics on a progress point that can be charted over time. */
export type ProgressMetric =
  | 'estimatedOneRepMax'
  | 'totalVolume'
  | 'bestWeightKg'
  | 'bestDurationSeconds'
  | 'bestDistanceMeters';

export interface ChartBar {
  /** ISO date of the session this bar represents. */
  date: string;
  value: number;
  /** Height of the bar relative to the chart area, in the range 0..1. */
  heightRatio: number;
}

export interface ChartSeries {
  bars: ChartBar[];
  min: number;
  max: number;
}

// Keep the shortest bar visible instead of collapsing it to nothing.
const MIN_BAR_RATIO = 0.08;

/**
 * Scale a list of dated values into a normalized bar series.
 *
 * Entries are expected oldest-first; the most recent `maxPoints` are kept so the
 * chart shows the latest trend. Heights are scaled across the visible range so
 * differences are easy to read.
 */
export function scaleSeries(
  entries: Array<{ date: string; value: number }>,
  maxPoints: number,
): ChartSeries {
  const recent = entries.slice(-maxPoints);

  if (recent.length === 0) {
    return { bars: [], min: 0, max: 0 };
  }

  const values = recent.map((entry) => entry.value);
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min;

  const bars = recent.map((entry) => ({
    date: entry.date,
    value: entry.value,
    heightRatio:
      range === 0
        ? 1
        : MIN_BAR_RATIO + (1 - MIN_BAR_RATIO) * ((entry.value - min) / range),
  }));

  return { bars, min, max };
}

/**
 * Turn per-session progress points into a normalized bar series for one metric.
 * Points missing the metric are skipped.
 */
export function buildProgressSeries(
  points: ExerciseProgressPoint[],
  metric: ProgressMetric,
  maxPoints = 12,
): ChartSeries {
  const entries = points
    .map((point) => ({ date: point.date, value: point[metric] }))
    .filter(
      (entry): entry is { date: string; value: number } =>
        typeof entry.value === 'number' && Number.isFinite(entry.value),
    );

  return scaleSeries(entries, maxPoints);
}

/**
 * Turn weekly volume points into a normalized bar series keyed by week start.
 */
export function buildWeeklyVolumeSeries(
  points: WeeklyVolumePoint[],
  maxPoints = 8,
): ChartSeries {
  return scaleSeries(
    points.map((point) => ({ date: point.weekStart, value: point.totalVolume })),
    maxPoints,
  );
}
