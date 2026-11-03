import type { BodyMeasurementEntry, BodyMeasurementKey, WeightUnit } from '@workout/domain';

import { fromCm, lengthUnitFor, toCm } from '@/lib/length';
import { fromKg, toKg } from '@/lib/weight';

/** How a measurement is stored and shown: kg, cm, or a percentage as entered. */
export type MeasurementDimension = 'weight' | 'length' | 'percent';

/** Every measurement in scope, in the order the profile and form list them. */
export const MEASUREMENT_KINDS: ReadonlyArray<{
  key: BodyMeasurementKey;
  dimension: MeasurementDimension;
}> = [
  { key: 'weightKg', dimension: 'weight' },
  { key: 'bodyFatPercent', dimension: 'percent' },
  { key: 'musclePercent', dimension: 'percent' },
  { key: 'neckCm', dimension: 'length' },
  { key: 'chestCm', dimension: 'length' },
  { key: 'waistCm', dimension: 'length' },
  { key: 'hipsCm', dimension: 'length' },
  { key: 'armCm', dimension: 'length' },
  { key: 'forearmCm', dimension: 'length' },
  { key: 'thighCm', dimension: 'length' },
  { key: 'calfCm', dimension: 'length' },
];

export function isMeasurementKey(value: unknown): value is BodyMeasurementKey {
  return MEASUREMENT_KINDS.some((kind) => kind.key === value);
}

export function dimensionOf(key: BodyMeasurementKey): MeasurementDimension {
  return MEASUREMENT_KINDS.find((kind) => kind.key === key)?.dimension ?? 'percent';
}

/** Unit label in the display unit: kg/lb, cm/in or %. */
export function displayUnitOf(key: BodyMeasurementKey, unit: WeightUnit): string {
  const dimension = dimensionOf(key);
  if (dimension === 'weight') return unit;
  if (dimension === 'length') return lengthUnitFor(unit);
  return '%';
}

function roundOne(value: number): number {
  return Math.round(value * 10) / 10;
}

function roundTwo(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Canonical (kg, cm, %) → display unit, rounded to one decimal; body weight in
 * kg keeps two, as a scale may show them (spec 0040 FR-7). In lb one is kept,
 * so a weight logged in kg does not read as 181.66 lb.
 */
export function toDisplayValue(key: BodyMeasurementKey, canonical: number, unit: WeightUnit): number {
  const dimension = dimensionOf(key);
  if (dimension === 'weight') {
    return unit === 'kg' ? roundTwo(canonical) : roundOne(fromKg(canonical, unit));
  }
  if (dimension === 'length') return roundOne(fromCm(canonical, unit));
  return roundOne(canonical);
}

/** A value typed in the display unit → canonical (kg, cm, %). */
export function fromDisplayValue(key: BodyMeasurementKey, display: number, unit: WeightUnit): number {
  const dimension = dimensionOf(key);
  if (dimension === 'weight') return toKg(display, unit);
  if (dimension === 'length') return toCm(display, unit);
  return display;
}

/** e.g. `'82.4 kg'`, `'34.6 in'`, `'18 %'`. */
export function formatMeasurement(key: BodyMeasurementKey, canonical: number, unit: WeightUnit): string {
  return `${toDisplayValue(key, canonical, unit)} ${displayUnitOf(key, unit)}`;
}

/** A signed change in the display unit, e.g. `'−0.7 kg'`, `'+1.2 cm'`. */
export function formatChange(key: BodyMeasurementKey, deltaCanonical: number, unit: WeightUnit): string {
  const value = toDisplayValue(key, deltaCanonical, unit);
  const sign = value > 0 ? '+' : value < 0 ? '−' : '';
  return `${sign}${Math.abs(value)} ${displayUnitOf(key, unit)}`;
}

export interface MeasurementPoint {
  entryId: string;
  measuredAt: string;
  /** Canonical value (kg, cm, %). */
  value: number;
}

function compareOldestFirst(a: BodyMeasurementEntry, b: BodyMeasurementEntry): number {
  return (
    a.measuredAt.localeCompare(b.measuredAt) || a.createdAt.localeCompare(b.createdAt)
  );
}

/**
 * The entries that carry `key`, oldest first. Every entry is its own point,
 * including two on the same day (EF-3).
 */
export function historyOf(entries: BodyMeasurementEntry[], key: BodyMeasurementKey): MeasurementPoint[] {
  return [...entries]
    .sort(compareOldestFirst)
    .flatMap((entry) => {
      const value = entry[key];
      return typeof value === 'number' ? [{ entryId: entry.id, measuredAt: entry.measuredAt, value }] : [];
    });
}

/** The most recent value of each measurement that has one (FR-4). */
export function latestByKind(
  entries: BodyMeasurementEntry[],
): Partial<Record<BodyMeasurementKey, MeasurementPoint>> {
  const latest: Partial<Record<BodyMeasurementKey, MeasurementPoint>> = {};
  for (const { key } of MEASUREMENT_KINDS) {
    const points = historyOf(entries, key);
    const last = points[points.length - 1];
    if (last) {
      latest[key] = last;
    }
  }
  return latest;
}

/**
 * Change since the previous entry and since the first, canonical units.
 * `null` with fewer than two entries (EF-4).
 */
export function changesOf(points: MeasurementPoint[]): { sincePrevious: number; sinceFirst: number } | null {
  if (points.length < 2) {
    return null;
  }
  const last = points[points.length - 1]!.value;
  return {
    sincePrevious: last - points[points.length - 2]!.value,
    sinceFirst: last - points[0]!.value,
  };
}

/** BMI = kg / m², one decimal; `null` unless both values exist (FR-5). */
export function bodyMassIndex(weightKg?: number | null, heightCm?: number | null): number | null {
  if (!weightKg || !heightCm) {
    return null;
  }
  const meters = heightCm / 100;
  return roundOne(weightKg / (meters * meters));
}

export type BmiBand = 'underweight' | 'normal' | 'overweight' | 'obese';

/** The WHO adult band for a BMI. */
export function bmiBand(bmi: number): BmiBand {
  if (bmi < 18.5) return 'underweight';
  if (bmi < 25) return 'normal';
  if (bmi < 30) return 'overweight';
  return 'obese';
}

/** Waist ÷ height, two decimals; `null` unless both values exist (FR-6). */
export function waistToHeight(waistCm?: number | null, heightCm?: number | null): number | null {
  if (!waistCm || !heightCm) {
    return null;
  }
  return Math.round((waistCm / heightCm) * 100) / 100;
}
