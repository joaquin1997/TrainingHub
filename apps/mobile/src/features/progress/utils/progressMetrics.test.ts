import { describe, expect, it } from 'vitest';
import type { ExerciseProgressPoint, ExerciseTrackingType } from '@workout/domain';
import { detailSeries, filterProgressPeriod, formatMetricValue, heaviestSetText, metricsFor, metricValue, periodStart } from './progressMetrics';
const point = (date: string, values: Partial<ExerciseProgressPoint> = {}): ExerciseProgressPoint => ({ date, totalVolume: 0, ...values });
describe('typed progress metrics', () => {
  it.each<[ExerciseTrackingType, string[]]>([
    ['weight_reps', ['weight', 'volume', 'estimate']], ['reps', ['reps', 'totalReps']], ['duration', ['duration']],
    ['weight_duration', ['duration', 'weight']], ['distance_duration', ['distance', 'duration']],
  ])('offers explicit metrics/default for %s', (type, expected) => { expect(metricsFor(type)).toEqual(expected); });
  it('never silently substitutes a metric or invents zero from the old volume field', () => {
    const p = point('2026-11-01', { bestReps: 12, totalVolume: 0 });
    expect(metricValue(p, 'weight')).toBeUndefined();
    expect(detailSeries([p], 'estimate').points).toEqual([]);
    expect(detailSeries([p], 'volume').points).toEqual([]);
    expect(detailSeries([p], 'reps').points[0].value).toBe(12);
    expect(detailSeries([point(p.date, { sessionVolumeKg: 0 })], 'volume').points[0].value).toBe(0);
  });
  it('keeps all eligible sessions, identities and first-session silence', () => {
    const series = detailSeries(Array.from({ length: 30 }, (_, i) => point('2026-11-01', { workoutId: `w${i}`, bestReps: i + 1 })), 'reps');
    expect(series.points).toHaveLength(30);
    expect(series.points[0].isRecord).toBe(false);
    expect(series.points[29].workoutId).toBe('w29');
  });
  it('pairs the actual heaviest set without importing independent maximum reps', () => {
    const p = point('2026-11-01', { bestWeightKg: 100, bestReps: 12, heaviestWorkingSet: { weightKg: 100, reps: 5 } });
    expect(heaviestSetText(p, 'kg', { left: 'I', right: 'D' })).toBe('100 kg × 5');
    expect(heaviestSetText(point(p.date, { bestWeightKg: 100, bestReps: 12 }), 'kg', { left: 'I', right: 'D' })).toBeUndefined();
  });
  it('converts weighted metrics only at display and formats durations/distances/reps', () => {
    expect(Number(formatMetricValue(100, 'weight', 'lb', 'reps'))).toBeCloseTo(220.5, 0);
    expect(formatMetricValue(90, 'duration', 'kg', 'reps')).toBe('1:30 min:s');
    expect(formatMetricValue(1500, 'distance', 'lb', 'reps')).toBe('1.5 km');
    expect(formatMetricValue(12, 'totalReps', 'lb', 'reps')).toBe('12 reps');
  });
  it('does not reinterpret old reps into time after reclassification', () => {
    expect(detailSeries([point('2026-11-01', { bestReps: 60 })], 'duration').points).toEqual([]);
  });
});
describe('local calendar periods', () => {
  it('clamps month-end instead of overflowing into the following month', () => {
    expect(periodStart('month', new Date(2026, 2, 31))).toEqual(new Date(2026, 1, 28));
    expect(periodStart('month', new Date(2024, 2, 31))).toEqual(new Date(2024, 1, 29));
  });
  it('subtracts three/six calendar months and handles the year boundary', () => {
    expect(periodStart('threeMonths', new Date(2026, 0, 31))).toEqual(new Date(2025, 9, 31));
    expect(periodStart('sixMonths', new Date(2026, 0, 31))).toEqual(new Date(2025, 6, 31));
    expect(periodStart('all', new Date())).toBeUndefined();
  });
  it('includes both boundary days and excludes future days for chart/list together', () => {
    const now = new Date(2026, 10, 3, 12);
    const points = [new Date(2026, 7, 2, 23, 59), new Date(2026, 7, 3),
      new Date(2026, 10, 3, 23, 59), new Date(2026, 10, 4)].map((date) => point(date.toISOString(), { bestReps: 1 }));
    const selected = filterProgressPeriod(points, 'threeMonths', now);
    expect(selected).toEqual(points.slice(1, 3));
    expect(detailSeries(selected, 'reps').points).toHaveLength(2);
    expect(filterProgressPeriod(points, 'all', now)).toEqual(points.slice(0, 3));
  });
  it('uses calendar dates across DST rather than fixed hour durations', () => {
    const now = new Date(2026, 10, 3);
    const start = periodStart('month', now)!;
    expect([start.getFullYear(), start.getMonth(), start.getDate(), start.getHours()]).toEqual([2026, 9, 3, 0]);
  });
});
