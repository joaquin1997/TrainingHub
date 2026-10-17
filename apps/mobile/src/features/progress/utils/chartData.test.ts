import { describe, expect, it } from 'vitest';

import {
  barHeightRatio,
  buildProgressSeries,
  buildWeeklyVolumeSeries,
  pointLabel,
  pointReadout,
  scaleSeries,
} from './chartData';
import type { ExerciseProgressPoint } from '@workout/domain';

function point(
  date: string,
  values: Partial<ExerciseProgressPoint>,
): ExerciseProgressPoint {
  return { date, totalVolume: 0, ...values };
}

// A fake `t` that shows the key and its options, so labels can be asserted.
const t = (key: string, options?: Record<string, unknown>) =>
  `${key}|${options?.date as string}|${options?.value as string}`;

describe('buildProgressSeries', () => {
  it('returns an empty series when no point has the metric', () => {
    const series = buildProgressSeries(
      [point('2026-01-01', { totalVolume: 100 })],
      'estimatedOneRepMax',
    );

    expect(series.points).toHaveLength(0);
    expect(series.max).toBe(0);
  });

  it('skips points missing the metric, so the line joins the known ones (AC-16, EF-7)', () => {
    const series = buildProgressSeries(
      [
        point('2026-01-01', { estimatedOneRepMax: 100 }),
        point('2026-01-02', {}),
        point('2026-01-03', { estimatedOneRepMax: 120 }),
      ],
      'estimatedOneRepMax',
    );

    expect(series.points.map((entry) => entry.value)).toEqual([100, 120]);
    expect(series.points.map((entry) => entry.x)).toEqual([0, 1]);
  });

  it('skips zero volume when positiveOnly is set, and keeps it otherwise', () => {
    const points = [
      point('2026-01-01', { totalVolume: 500 }),
      point('2026-01-02', { totalVolume: 0 }),
      point('2026-01-03', { totalVolume: 600 }),
    ];

    expect(
      buildProgressSeries(points, 'totalVolume', { positiveOnly: true }).points.map(
        (entry) => entry.value,
      ),
    ).toEqual([500, 600]);
    expect(buildProgressSeries(points, 'totalVolume').points).toHaveLength(3);
  });

  it('keeps the record flag of each point', () => {
    const series = buildProgressSeries(
      [
        point('2026-01-01', { estimatedOneRepMax: 100 }),
        point('2026-01-08', { estimatedOneRepMax: 105, isRecord: true }),
      ],
      'estimatedOneRepMax',
    );

    expect(series.points.map((entry) => entry.isRecord)).toEqual([false, true]);
  });

  it('spaces points evenly and pads the y-domain by 10 % (not zero-based)', () => {
    const series = buildProgressSeries(
      [
        point('2026-01-01', { totalVolume: 100 }),
        point('2026-01-02', { totalVolume: 105 }),
        point('2026-01-03', { totalVolume: 110 }),
      ],
      'totalVolume',
    );

    expect(series.min).toBe(100);
    expect(series.max).toBe(110);
    expect(series.points.map((entry) => entry.x)).toEqual([0, 0.5, 1]);
    expect(series.points[0]!.y).toBeCloseTo(1 / 12);
    expect(series.points[1]!.y).toBeCloseTo(0.5);
    expect(series.points[2]!.y).toBeCloseTo(11 / 12);
  });

  it('centres a single point (AC-16)', () => {
    const series = buildProgressSeries(
      [point('2026-01-01', { estimatedOneRepMax: 90 })],
      'estimatedOneRepMax',
    );

    expect(series.points).toEqual([
      { date: '2026-01-01', value: 90, isRecord: false, x: 0.5, y: 0.5 },
    ]);
  });

  it('puts a flat series at mid-height', () => {
    const series = buildProgressSeries(
      [
        point('2026-01-01', { totalVolume: 80 }),
        point('2026-01-02', { totalVolume: 80 }),
      ],
      'totalVolume',
    );

    expect(series.points.every((entry) => entry.y === 0.5)).toBe(true);
  });

  it('keeps only the most recent points up to the limit (window unchanged: 12)', () => {
    const points = Array.from({ length: 15 }, (_, index) =>
      point(`2026-01-${String(index + 1).padStart(2, '0')}`, { totalVolume: index + 1 }),
    );

    expect(buildProgressSeries(points, 'totalVolume').points).toHaveLength(12);
    expect(
      buildProgressSeries(points, 'totalVolume', { maxPoints: 3 }).points.map(
        (entry) => entry.value,
      ),
    ).toEqual([13, 14, 15]);
  });
});

describe('buildWeeklyVolumeSeries', () => {
  it('maps weekly volume points to dated points', () => {
    const series = buildWeeklyVolumeSeries([
      { weekStart: '2026-04-27', totalVolume: 1120, workoutCount: 1 },
      { weekStart: '2026-05-04', totalVolume: 420, workoutCount: 1 },
    ]);

    expect(series.points.map((entry) => ({ date: entry.date, value: entry.value }))).toEqual([
      { date: '2026-04-27', value: 1120 },
      { date: '2026-05-04', value: 420 },
    ]);
    expect(series.max).toBe(1120);
  });

  it('treats a week without volume as a gap, not a zero (EF-7)', () => {
    const series = buildWeeklyVolumeSeries([
      { weekStart: '2026-04-27', totalVolume: 1120, workoutCount: 1 },
      { weekStart: '2026-05-04', totalVolume: 0, workoutCount: 2 },
      { weekStart: '2026-05-11', totalVolume: 900, workoutCount: 1 },
    ]);

    expect(series.points.map((entry) => entry.value)).toEqual([1120, 900]);
  });

  it('keeps the last eight weeks', () => {
    const weeks = Array.from({ length: 10 }, (_, index) => ({
      weekStart: `2026-0${Math.floor(index / 4) + 1}-0${(index % 4) + 1}`,
      totalVolume: 100 + index,
      workoutCount: 1,
    }));

    expect(buildWeeklyVolumeSeries(weeks).points).toHaveLength(8);
  });

  it('returns an empty series when there is no volume data', () => {
    expect(buildWeeklyVolumeSeries([]).points).toHaveLength(0);
  });
});

describe('barHeightRatio (bar fallback)', () => {
  it('scales the tallest bar to 1 and keeps the shortest visible', () => {
    expect(barHeightRatio(100, 50, 100)).toBe(1);
    expect(barHeightRatio(50, 50, 100)).toBeGreaterThan(0);
    expect(barHeightRatio(50, 50, 100)).toBeLessThan(1);
  });

  it('gives every bar full height when all values are equal', () => {
    expect(barHeightRatio(80, 80, 80)).toBe(1);
  });
});

describe('point labels (FR-22, AC-15)', () => {
  const format = {
    formatDate: (date: string) => `d(${date})`,
    formatValue: (value: number) => value.toFixed(1),
    unit: 'kg',
  };
  // Eight sessions, the 3rd and the 7th beat a record.
  const series = scaleSeries(
    Array.from({ length: 8 }, (_, index) => ({
      date: `2026-05-0${index + 1}`,
      value: 100 + index * 2.5,
      isRecord: index === 2 || index === 6,
    })),
    12,
  );

  it('gives one label per point, in order, naming the records', () => {
    const labels = series.points.map((entry) => pointLabel(entry, format, t));

    expect(labels).toHaveLength(8);
    expect(labels[0]).toBe('progress.chart.pointLabel|d(2026-05-01)|100.0 kg');
    expect(labels[2]).toBe('progress.chart.pointLabelRecord|d(2026-05-03)|105.0 kg');
    expect(labels.filter((label) => label.includes('pointLabelRecord'))).toHaveLength(2);
  });

  it('reads out the fifth point in the display unit', () => {
    expect(pointReadout(series.points[4]!, format, t)).toBe(
      'progress.chart.readout|d(2026-05-05)|110.0 kg',
    );
  });

  it('leaves the unit out when the chart has none', () => {
    expect(pointReadout(series.points[0]!, { ...format, unit: undefined }, t)).toBe(
      'progress.chart.readout|d(2026-05-01)|100.0',
    );
  });
});
