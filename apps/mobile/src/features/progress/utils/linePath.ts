import type { ChartPoint } from './chartData';

/** A point in the plot's own pixels, y growing downwards as SVG draws it. */
export interface PlotPoint {
  x: number;
  y: number;
}

export interface PlotFrame {
  width: number;
  height: number;
  /** Room kept left and right so the end dots are not clipped. */
  insetX: number;
  /** Room kept above and below for the same reason. */
  insetY: number;
}

/** Places a series' 0..1 points inside the plot, in pixels. */
export function layoutPoints(points: ChartPoint[], frame: PlotFrame): PlotPoint[] {
  const innerWidth = Math.max(0, frame.width - 2 * frame.insetX);
  const innerHeight = Math.max(0, frame.height - 2 * frame.insetY);

  return points.map((point) => ({
    x: frame.insetX + point.x * innerWidth,
    y: frame.insetY + (1 - point.y) * innerHeight,
  }));
}

/** One cubic Bézier segment: from `start` through two controls to `end`. */
export interface CurveSegment {
  start: PlotPoint;
  control1: PlotPoint;
  control2: PlotPoint;
  end: PlotPoint;
}

/**
 * Monotone cubic interpolation (Fritsch–Carlson). Tangents are limited so each
 * segment stays between its two end values: the curve is smooth but never
 * overshoots below the lowest or above the highest point, so it cannot dip
 * toward zero (EF-7). Points must be ordered by x.
 */
export function monotoneSegments(points: PlotPoint[]): CurveSegment[] {
  const count = points.length;
  if (count < 2) {
    return [];
  }

  const widths: number[] = [];
  const slopes: number[] = [];
  for (let index = 0; index < count - 1; index += 1) {
    const width = points[index + 1]!.x - points[index]!.x;
    widths.push(width);
    slopes.push(width === 0 ? 0 : (points[index + 1]!.y - points[index]!.y) / width);
  }

  const tangents: number[] = new Array<number>(count);
  tangents[0] = slopes[0]!;
  tangents[count - 1] = slopes[count - 2]!;
  for (let index = 1; index < count - 1; index += 1) {
    const before = slopes[index - 1]!;
    const after = slopes[index]!;
    // A local peak or valley (or a flat side) gets a flat tangent.
    tangents[index] = before * after <= 0 ? 0 : (before + after) / 2;
  }

  for (let index = 0; index < count - 1; index += 1) {
    const slope = slopes[index]!;
    if (slope === 0) {
      tangents[index] = 0;
      tangents[index + 1] = 0;
      continue;
    }

    const alpha = tangents[index]! / slope;
    const beta = tangents[index + 1]! / slope;
    const length = alpha * alpha + beta * beta;
    if (length > 9) {
      const tau = 3 / Math.sqrt(length);
      tangents[index] = tau * alpha * slope;
      tangents[index + 1] = tau * beta * slope;
    }
  }

  return slopes.map((_, index) => {
    const start = points[index]!;
    const end = points[index + 1]!;
    const third = widths[index]! / 3;
    return {
      start,
      control1: { x: start.x + third, y: start.y + tangents[index]! * third },
      control2: { x: end.x - third, y: end.y - tangents[index + 1]! * third },
      end,
    };
  });
}

const fixed = (value: number) => Number(value.toFixed(2));
const pair = (point: PlotPoint) => `${fixed(point.x)} ${fixed(point.y)}`;

/** SVG `d` of the smooth line; empty for fewer than two points (no line). */
export function monotonePath(points: PlotPoint[]): string {
  const segments = monotoneSegments(points);
  if (segments.length === 0) {
    return '';
  }

  return [
    `M${pair(segments[0]!.start)}`,
    ...segments.map(
      (segment) => `C${pair(segment.control1)} ${pair(segment.control2)} ${pair(segment.end)}`,
    ),
  ].join(' ');
}

/** SVG `d` of the area under the line, closed down to `baseline`; empty without a line. */
export function areaPath(points: PlotPoint[], baseline: number): string {
  const line = monotonePath(points);
  if (!line) {
    return '';
  }

  const first = points[0]!;
  const last = points[points.length - 1]!;
  return `${line} L${fixed(last.x)} ${fixed(baseline)} L${fixed(first.x)} ${fixed(baseline)} Z`;
}

/** Index of the point closest to `x` horizontally (-1 with no points). */
export function nearestIndex(points: PlotPoint[], x: number): number {
  let best = -1;
  let bestDistance = Number.POSITIVE_INFINITY;

  points.forEach((point, index) => {
    const distance = Math.abs(point.x - x);
    if (distance < bestDistance) {
      best = index;
      bestDistance = distance;
    }
  });

  return best;
}
