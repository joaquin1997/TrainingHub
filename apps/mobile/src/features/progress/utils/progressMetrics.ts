import type { ExerciseProgressPoint, ExerciseTrackingType, WeightUnit } from '@workout/domain';
import { formatDuration } from '@/lib/format';
import { formatDistance, formatSetValues, type SideLabels } from '@/lib/tracking';
import { formatWeightValue, fromKg, roundWeight } from '@/lib/weight';
import { scaleSeries, type ChartEntry } from './chartData';

export type DetailMetric = 'weight' | 'volume' | 'estimate' | 'reps' | 'totalReps' | 'duration' | 'distance';
export type ProgressPeriod = 'month' | 'threeMonths' | 'sixMonths' | 'all';
export const PROGRESS_PERIODS: ProgressPeriod[] = ['month', 'threeMonths', 'sixMonths', 'all'];
const metrics: Record<ExerciseTrackingType, DetailMetric[]> = {
  weight_reps: ['weight', 'volume', 'estimate'],
  reps: ['reps', 'totalReps'],
  duration: ['duration'],
  weight_duration: ['duration', 'weight'],
  distance_duration: ['distance', 'duration'],
};
export const metricsFor = (type: ExerciseTrackingType = 'weight_reps'): readonly DetailMetric[] => metrics[type];

export function periodStart(period: ProgressPeriod, now: Date): Date | undefined {
  if (period === 'all') return undefined;
  const months = { month: 1, threeMonths: 3, sixMonths: 6 }[period];
  const start = new Date(now.getFullYear(), now.getMonth() - months, 1);
  const lastDay = new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate();
  start.setDate(Math.min(now.getDate(), lastDay));
  return start;
}

export function filterProgressPeriod(points: ExerciseProgressPoint[], period: ProgressPeriod, now: Date) {
  const start = periodStart(period, now)?.getTime() ?? -Infinity;
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime();
  return points.filter((point) => {
    const date = new Date(point.date).getTime();
    return date >= start && date < end;
  });
}

export function metricValue(point: ExerciseProgressPoint, metric: DetailMetric): number | undefined {
  switch (metric) {
    case 'weight': return point.heaviestWorkingSet?.weightKg;
    case 'volume': return point.sessionVolumeKg;
    case 'estimate': return point.estimatedOneRepMax;
    case 'reps': return point.bestReps;
    case 'totalReps': return point.totalWorkingReps;
    case 'duration': return point.bestDurationSeconds;
    case 'distance': return point.bestDistanceMeters;
  }
}
export const isWeightMetric = (metric: DetailMetric) => ['weight', 'volume', 'estimate'].includes(metric);
export function metricUnit(metric: DetailMetric, unit: WeightUnit): string | undefined {
  if (isWeightMetric(metric)) return unit;
  return undefined; // Duration/distance/reps formatters include localized units.
}
export function formatProgressDuration(value: number) {
  return `${formatDuration(value)} ${value >= 3600 ? 'h:min:s' : 'min:s'}`;
}
export function formatMetricValue(value: number, metric: DetailMetric, unit: WeightUnit, repsLabel: string) {
  if (isWeightMetric(metric)) return String(roundWeight(fromKg(value, unit)));
  if (metric === 'duration') return formatProgressDuration(value);
  if (metric === 'distance') return formatDistance(value);
  return `${value} ${repsLabel}`;
}
export function detailSeries(points: ExerciseProgressPoint[], metric: DetailMetric) {
  const entries: ChartEntry[] = points.flatMap((point) => {
    const value = metricValue(point, metric);
    return typeof value === 'number' && Number.isFinite(value)
      ? [{ date: point.date, value, workoutId: point.workoutId, isRecord: point.isRecord }] : [];
  });
  return scaleSeries(entries, entries.length);
}

/** Same-set evidence only. Missing weights on reps-only history never create a kg placeholder. */
export function heaviestSetText(point: ExerciseProgressPoint, unit: WeightUnit, sides: SideLabels) {
  const set = point.heaviestWorkingSet;
  if (!set) return undefined;
  if (set.reps === undefined && set.repsLeft === undefined && set.repsRight === undefined &&
      set.durationSeconds === undefined && set.distanceMeters === undefined) {
    return set.weightKg === undefined ? undefined : standaloneWeight(set.weightKg, unit);
  }
  const text = formatSetValues(set, unit, sides);
  return set.durationSeconds === undefined ? text : `${text} ${set.durationSeconds >= 3600 ? 'h:min:s' : 'min:s'}`;
}
export function standaloneWeight(value: number, unit: WeightUnit) {
  return `${formatWeightValue(value, unit)} ${unit}`;
}
