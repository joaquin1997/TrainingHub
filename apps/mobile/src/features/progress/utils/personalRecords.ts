import type { ExerciseProgressPoint } from '@workout/domain';

/** A session where the exercise hit a new all-time heaviest set. */
export interface PersonalRecord {
  date: string;
  weightKg: number;
  reps?: number;
  estimatedOneRepMax?: number;
}

/**
 * Walks per-session points (oldest-first) and returns the sessions that set a
 * new max-weight record — the exercise's PR timeline. Matches the max-weight
 * definition used by `isRecordSession` in the API aggregation.
 */
export function extractPersonalRecords(
  points: ExerciseProgressPoint[],
): PersonalRecord[] {
  const records: PersonalRecord[] = [];
  let best = 0;

  for (const point of points) {
    if (point.bestWeightKg !== undefined && point.bestWeightKg > best) {
      best = point.bestWeightKg;
      records.push({
        date: point.date,
        weightKg: point.bestWeightKg,
        reps: point.bestReps,
        estimatedOneRepMax: point.estimatedOneRepMax,
      });
    }
  }

  return records;
}

/**
 * Sessions that set a new longest time or distance (spec 0021 FR-6), as for
 * weight above: each one beats every earlier session.
 */
export function extractMetricRecords(
  points: ExerciseProgressPoint[],
  metric: 'bestDurationSeconds' | 'bestDistanceMeters',
): Array<{ date: string; value: number }> {
  const records: Array<{ date: string; value: number }> = [];
  let best = 0;

  for (const point of points) {
    const value = point[metric];
    if (value !== undefined && value > best) {
      best = value;
      records.push({ date: point.date, value });
    }
  }

  return records;
}
