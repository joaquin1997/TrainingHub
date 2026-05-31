import { describe, expect, it } from 'vitest';

import { buildProgressSeries } from './chartData';
import type { ExerciseProgressPoint } from '@workout/domain';

function point(
  date: string,
  values: Partial<ExerciseProgressPoint>,
): ExerciseProgressPoint {
  return { date, totalVolume: 0, ...values };
}

describe('buildProgressSeries', () => {
  it('returns an empty series when no point has the metric', () => {
    const series = buildProgressSeries(
      [point('2026-01-01', { totalVolume: 100 })],
      'estimatedOneRepMax',
    );

    expect(series.bars).toHaveLength(0);
    expect(series.max).toBe(0);
  });

  it('skips points missing the metric', () => {
    const series = buildProgressSeries(
      [
        point('2026-01-01', { estimatedOneRepMax: 100 }),
        point('2026-01-02', {}),
        point('2026-01-03', { estimatedOneRepMax: 120 }),
      ],
      'estimatedOneRepMax',
    );

    expect(series.bars.map((bar) => bar.value)).toEqual([100, 120]);
  });

  it('scales the tallest bar to 1 and keeps the shortest visible', () => {
    const series = buildProgressSeries(
      [
        point('2026-01-01', { totalVolume: 50 }),
        point('2026-01-02', { totalVolume: 100 }),
      ],
      'totalVolume',
    );

    expect(series.min).toBe(50);
    expect(series.max).toBe(100);
    expect(series.bars[1].heightRatio).toBe(1);
    expect(series.bars[0].heightRatio).toBeGreaterThan(0);
    expect(series.bars[0].heightRatio).toBeLessThan(1);
  });

  it('gives every bar full height when all values are equal', () => {
    const series = buildProgressSeries(
      [
        point('2026-01-01', { totalVolume: 80 }),
        point('2026-01-02', { totalVolume: 80 }),
      ],
      'totalVolume',
    );

    expect(series.bars.every((bar) => bar.heightRatio === 1)).toBe(true);
  });

  it('keeps only the most recent points up to the limit', () => {
    const points = Array.from({ length: 5 }, (_, index) =>
      point(`2026-01-0${index + 1}`, { totalVolume: index + 1 }),
    );

    const series = buildProgressSeries(points, 'totalVolume', 3);

    expect(series.bars.map((bar) => bar.value)).toEqual([3, 4, 5]);
  });
});
