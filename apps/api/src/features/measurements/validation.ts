import type { BodyMeasurementKey, MeasurementRangeError } from '@workout/domain';

import { checkRange } from './ranges.js';

export const BODY_MEASUREMENT_KEYS: readonly BodyMeasurementKey[] = [
  'weightKg',
  'bodyFatPercent',
  'musclePercent',
  'neckCm',
  'chestCm',
  'waistCm',
  'hipsCm',
  'armCm',
  'forearmCm',
  'thighCm',
  'calfCm',
];

/** A validated entry: the date plus every measurement, `null` when not taken. */
export type MeasurementWrite = { measuredAt: Date } & Record<BodyMeasurementKey, number | null>;

type Failure = { message: string } | MeasurementRangeError;
export type ParseResult<T> = { ok: true; value: T } | { ok: false; error: Failure };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

const allowedKeys = new Set<string>(['measuredAt', ...BODY_MEASUREMENT_KEYS]);

/**
 * Validates a create or full-replace body: a valid date, at least one
 * measurement, every value inside its plausible range (EF-2), nothing else.
 */
export function parseMeasurementInput(body: unknown): ParseResult<MeasurementWrite> {
  if (!isRecord(body)) {
    return { ok: false, error: { message: 'Invalid measurement payload' } };
  }

  const unknown = Object.keys(body).find((key) => !allowedKeys.has(key));
  if (unknown) {
    return { ok: false, error: { message: `Unknown field: ${unknown}` } };
  }

  const measuredAt =
    typeof body.measuredAt === 'string' ? new Date(body.measuredAt) : new Date(Number.NaN);
  if (Number.isNaN(measuredAt.getTime())) {
    return { ok: false, error: { message: 'measuredAt must be an ISO date' } };
  }

  const value = { measuredAt } as MeasurementWrite;
  let count = 0;

  for (const key of BODY_MEASUREMENT_KEYS) {
    const raw = body[key];
    if (raw === undefined || raw === null) {
      value[key] = null;
      continue;
    }
    if (typeof raw !== 'number') {
      return { ok: false, error: { message: `${key} must be a number` } };
    }
    const rangeError = checkRange(key, raw);
    if (rangeError) {
      return { ok: false, error: rangeError };
    }
    value[key] = raw;
    count += 1;
  }

  if (count === 0) {
    return { ok: false, error: { message: 'An entry needs at least one measurement' } };
  }

  return { ok: true, value };
}
