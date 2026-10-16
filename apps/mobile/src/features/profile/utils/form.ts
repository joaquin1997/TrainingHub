import type { MeasurementRangeError } from '@workout/domain';

import { ApiError } from '@/lib/http';

/**
 * Parses a decimal typed by the person, accepting a comma as the decimal
 * separator ("82,4"). Empty → `null` (not measured); anything else that is not
 * a positive finite number → `undefined` (invalid).
 */
export function parseDecimalInput(text: string): number | null | undefined {
  const trimmed = text.trim();
  if (!trimmed) {
    return null;
  }
  if (!/^\d+([.,]\d*)?$|^[.,]\d+$/.test(trimmed)) {
    return undefined;
  }
  const value = Number(trimmed.replace(',', '.'));
  return Number.isFinite(value) ? value : undefined;
}

/** A number as an input string, one decimal at most (`80` → `'80'`). */
export function toInputString(value: number | null | undefined): string {
  return value === null || value === undefined ? '' : String(Math.round(value * 10) / 10);
}

/** The API's range error carried by a 400, or `null` for any other failure. */
export function readRangeError(error: unknown): MeasurementRangeError | null {
  if (!(error instanceof ApiError) || error.status !== 400) {
    return null;
  }
  const body = error.body as Partial<MeasurementRangeError> | null | undefined;
  return body &&
    typeof body.field === 'string' &&
    typeof body.min === 'number' &&
    typeof body.max === 'number'
    ? (body as MeasurementRangeError)
    : null;
}
