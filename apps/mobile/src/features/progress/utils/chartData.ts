import type { ExerciseProgressPoint, WeeklyVolumePoint } from '@workout/domain';

/** Numeric metrics on a progress point that can be charted over time. */
export type ProgressMetric =
  | 'estimatedOneRepMax'
  | 'totalVolume'
  | 'bestWeightKg'
  | 'bestDurationSeconds'
  | 'bestDistanceMeters';

export interface ChartPoint {
  /** ISO date of the session (or week) this point represents. */
  date: string;
  value: number;
  /** The session beat a record (spec 0034 FR-22): drawn as an orange point. */
  isRecord: boolean;
  /** Horizontal position in 0..1, evenly spaced by order (dates are labels). */
  x: number;
  /** Vertical position in 0..1, 0 at the bottom of the plot, 1 at the top. */
  y: number;
}

export interface ChartSeries {
  points: ChartPoint[];
  min: number;
  max: number;
}

export interface ChartEntry {
  date: string;
  value: number;
  isRecord?: boolean;
}

/** Room above the highest and below the lowest value, as a share of the range. */
const Y_PADDING = 0.1;

/**
 * Scale dated values into a line series.
 *
 * Entries are expected oldest-first; the most recent `maxPoints` are kept so the
 * chart shows the latest trend. The y-domain is the data's own min…max padded
 * by 10 % — not zero-based, so a 1RM moving from 100 to 110 stays readable. A
 * flat series (one point, or all equal) sits at mid-height.
 */
export function scaleSeries(entries: ChartEntry[], maxPoints: number): ChartSeries {
  const recent = entries.slice(-maxPoints);

  if (recent.length === 0) {
    return { points: [], min: 0, max: 0 };
  }

  const values = recent.map((entry) => entry.value);
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min;
  const low = min - range * Y_PADDING;
  const span = range * (1 + 2 * Y_PADDING);
  const last = recent.length - 1;

  const points = recent.map((entry, index) => ({
    date: entry.date,
    value: entry.value,
    isRecord: entry.isRecord === true,
    x: last === 0 ? 0.5 : index / last,
    y: range === 0 ? 0.5 : (entry.value - low) / span,
  }));

  return { points, min, max };
}

// Keep the shortest bar visible instead of collapsing it to nothing.
const MIN_BAR_RATIO = 0.08;

/**
 * Height of a bar relative to the chart area (0..1), for the bar fallback
 * drawn when the native SVG view is not in the installed binary.
 */
export function barHeightRatio(value: number, min: number, max: number): number {
  const range = max - min;
  return range === 0 ? 1 : MIN_BAR_RATIO + (1 - MIN_BAR_RATIO) * ((value - min) / range);
}

export interface ProgressSeriesOptions {
  /** Most recent points kept (default 12 sessions). */
  maxPoints?: number;
  /**
   * Treat 0 and below as "no value" (1RM, volume): a reps-only or timed
   * session has no volume, and the line must never dip to zero (EF-7).
   */
  positiveOnly?: boolean;
}

/**
 * Turn per-session progress points into a line series for one metric.
 * Points missing the metric are skipped, so the line joins the ones that have
 * it (EF-7). A point's record flag is kept.
 */
export function buildProgressSeries(
  points: ExerciseProgressPoint[],
  metric: ProgressMetric,
  { maxPoints = 12, positiveOnly = false }: ProgressSeriesOptions = {},
): ChartSeries {
  const entries = points
    .map((point) => ({ date: point.date, value: point[metric], isRecord: point.isRecord === true }))
    .filter(
      (entry): entry is { date: string; value: number; isRecord: boolean } =>
        typeof entry.value === 'number' &&
        Number.isFinite(entry.value) &&
        (!positiveOnly || entry.value > 0),
    );

  return scaleSeries(entries, maxPoints);
}

/**
 * Turn weekly volume points into a line series keyed by week start. A week
 * with no volume (only timed or reps-only work) is a gap, not a zero (EF-7).
 */
export function buildWeeklyVolumeSeries(
  points: WeeklyVolumePoint[],
  maxPoints = 8,
): ChartSeries {
  return scaleSeries(
    points
      .filter((point) => point.totalVolume > 0)
      .map((point) => ({ date: point.weekStart, value: point.totalVolume })),
    maxPoints,
  );
}

type Translate = (key: string, options?: Record<string, unknown>) => string;

export interface PointFormat {
  formatDate: (date: string) => string;
  formatValue: (value: number) => string;
  unit?: string;
}

/** "102.5 kg", or the bare figure when the chart has no unit. */
export function pointValueText(point: ChartPoint, format: PointFormat): string {
  const value = format.formatValue(point.value);
  return format.unit ? `${value} ${format.unit}` : value;
}

/**
 * What a screen reader says for one point (FR-22): "12 Oct, 102.5 kg", and
 * ", record" when the session beat one.
 */
export function pointLabel(point: ChartPoint, format: PointFormat, t: Translate): string {
  return t(point.isRecord ? 'progress.chart.pointLabelRecord' : 'progress.chart.pointLabel', {
    date: format.formatDate(point.date),
    value: pointValueText(point, format),
  });
}

/** The readout of a selected point in the chart's header: "12 Oct · 102.5 kg". */
export function pointReadout(point: ChartPoint, format: PointFormat, t: Translate): string {
  return t('progress.chart.readout', {
    date: format.formatDate(point.date),
    value: pointValueText(point, format),
  });
}
