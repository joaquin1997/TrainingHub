import { describe, expect, it } from 'vitest';

import { scaleSeries } from './chartData';
import {
  areaPath,
  layoutPoints,
  monotonePath,
  monotoneSegments,
  nearestIndex,
  type PlotPoint,
} from './linePath';

const frame = { width: 300, height: 140, insetX: 8, insetY: 8 };

function plot(values: number[]): PlotPoint[] {
  return layoutPoints(
    scaleSeries(
      values.map((value, index) => ({ date: `d${index}`, value })),
      values.length,
    ).points,
    frame,
  );
}

describe('layoutPoints', () => {
  it('maps 0..1 into the inset plot, y growing downwards', () => {
    const points = layoutPoints(
      [
        { date: 'a', value: 1, isRecord: false, x: 0, y: 0 },
        { date: 'b', value: 2, isRecord: false, x: 1, y: 1 },
      ],
      frame,
    );

    expect(points).toEqual([
      { x: 8, y: 132 },
      { x: 292, y: 8 },
    ]);
  });

  it('centres a single point', () => {
    expect(plot([90])).toEqual([{ x: 150, y: 70 }]);
  });
});

describe('monotonePath (EF-7)', () => {
  it('draws no line for one point (AC-16)', () => {
    expect(monotonePath(plot([90]))).toBe('');
    expect(areaPath(plot([90]), 140)).toBe('');
    expect(monotonePath([])).toBe('');
  });

  it('never leaves the range of its points, even around a sharp drop', () => {
    const points = plot([100, 140, 60, 61, 150, 150, 80, 120]);
    const ys = points.map((point) => point.y);
    const top = Math.min(...ys);
    const bottom = Math.max(...ys);

    // A Bézier stays inside its control points' hull: checking the controls
    // proves the curve never overshoots.
    for (const segment of monotoneSegments(points)) {
      const low = Math.min(segment.start.y, segment.end.y);
      const high = Math.max(segment.start.y, segment.end.y);
      for (const control of [segment.control1, segment.control2]) {
        expect(control.y).toBeGreaterThanOrEqual(low - 1e-9);
        expect(control.y).toBeLessThanOrEqual(high + 1e-9);
        expect(control.y).toBeGreaterThanOrEqual(top - 1e-9);
        expect(control.y).toBeLessThanOrEqual(bottom + 1e-9);
      }
    }
  });

  it('starts at the first point and ends at the last one', () => {
    const points = plot([100, 110, 105]);
    const path = monotonePath(points);
    const at = (point: PlotPoint) => `${Number(point.x.toFixed(2))} ${Number(point.y.toFixed(2))}`;

    expect(path.startsWith(`M${at(points[0]!)} `)).toBe(true);
    expect(path.endsWith(` ${at(points[2]!)}`)).toBe(true);
    expect(path.match(/C/g)).toHaveLength(2);
  });

  it('closes the area down to the baseline', () => {
    const points = plot([100, 110]);
    const area = areaPath(points, 140);

    expect(area.startsWith(monotonePath(points))).toBe(true);
    expect(area.endsWith(`L292 140 L8 140 Z`)).toBe(true);
  });

  it('builds a 100-point line quickly (NFR)', () => {
    const values = Array.from({ length: 100 }, (_, index) => 100 + Math.sin(index / 3) * 20);
    const started = performance.now();
    const path = areaPath(plot(values), 140);
    const elapsed = performance.now() - started;

    expect(path.match(/C/g)).toHaveLength(99);
    expect(elapsed).toBeLessThan(20);
  });
});

describe('nearestIndex', () => {
  // Eight sessions over the 284 pt wide plot: one every ~40.6 pt from x = 8.
  const points = plot([100, 102, 104, 106, 108, 110, 112, 114]);

  it('picks the fifth point when touched on it or near it (AC-15)', () => {
    expect(nearestIndex(points, points[4]!.x)).toBe(4);
    expect(nearestIndex(points, points[4]!.x + 15)).toBe(4);
    expect(nearestIndex(points, points[4]!.x - 15)).toBe(4);
  });

  it('clamps to the ends outside the plot', () => {
    expect(nearestIndex(points, -50)).toBe(0);
    expect(nearestIndex(points, 0)).toBe(0);
    expect(nearestIndex(points, 1000)).toBe(7);
  });

  it('takes the earlier point at an exact midpoint', () => {
    const midpoint = (points[2]!.x + points[3]!.x) / 2;
    expect(nearestIndex(points, midpoint)).toBe(2);
  });

  it('returns -1 without points', () => {
    expect(nearestIndex([], 10)).toBe(-1);
  });
});
