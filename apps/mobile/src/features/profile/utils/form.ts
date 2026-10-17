import type {
  BodyMeasurementKey,
  BodyMeasurementValues,
  MeasurementRangeError,
  WeightUnit,
} from '@workout/domain';

import { fromDisplayValue, MEASUREMENT_KINDS, toDisplayValue } from '@/features/profile/utils/measurements';
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

/** What the entry form shows: one text per measurement, in the display unit. */
export type EntryFormTexts = Record<BodyMeasurementKey, string>;

export function entryToTexts(values: BodyMeasurementValues | undefined, unit: WeightUnit): EntryFormTexts {
  const texts = {} as EntryFormTexts;
  for (const { key } of MEASUREMENT_KINDS) {
    const value = values?.[key];
    texts[key] = typeof value === 'number' ? toInputString(toDisplayValue(key, value, unit)) : '';
  }
  return texts;
}

export type EntryFormResult =
  | { ok: true; values: Record<BodyMeasurementKey, number | null>; count: number }
  | { ok: false; invalid: BodyMeasurementKey };

/**
 * Turns the form texts into canonical values. A field left as it was loaded
 * keeps its stored value, so opening and saving an entry in lb never drifts
 * the kg it holds.
 */
export function textsToValues(
  texts: EntryFormTexts,
  original: BodyMeasurementValues | undefined,
  unit: WeightUnit,
): EntryFormResult {
  const initial = entryToTexts(original, unit);
  const values = {} as Record<BodyMeasurementKey, number | null>;
  let count = 0;

  for (const { key } of MEASUREMENT_KINDS) {
    const text = texts[key];
    const stored = original?.[key];
    if (text === initial[key] && typeof stored === 'number') {
      values[key] = stored;
      count += 1;
      continue;
    }
    const parsed = parseDecimalInput(text);
    if (parsed === undefined) {
      return { ok: false, invalid: key };
    }
    values[key] = parsed === null ? null : fromDisplayValue(key, parsed, unit);
    if (parsed !== null) {
      count += 1;
    }
  }

  return { ok: true, values, count };
}
