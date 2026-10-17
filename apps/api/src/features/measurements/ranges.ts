import type { BodyMeasurementKey, MeasurementRangeError } from '@workout/domain';

export type RangedField = BodyMeasurementKey | 'heightCm';

/**
 * Plausible ranges in canonical units (kg, cm, %), wide enough for any adult
 * reading; anything outside is a typo or a unit mix-up (spec 0027 EF-2).
 */
export const PLAUSIBLE_RANGES: Record<RangedField, { min: number; max: number }> = {
  heightCm: { min: 50, max: 272 },
  weightKg: { min: 20, max: 400 },
  bodyFatPercent: { min: 2, max: 70 },
  // Scales report different things as "muscle %", hence the wide range.
  musclePercent: { min: 5, max: 90 },
  neckCm: { min: 20, max: 80 },
  chestCm: { min: 50, max: 200 },
  waistCm: { min: 40, max: 200 },
  hipsCm: { min: 50, max: 200 },
  armCm: { min: 10, max: 80 },
  forearmCm: { min: 10, max: 60 },
  thighCm: { min: 20, max: 120 },
  calfCm: { min: 15, max: 80 },
};

/** The range error for `value`, or `null` when it is plausible. */
export function checkRange(field: RangedField, value: number): MeasurementRangeError | null {
  const { min, max } = PLAUSIBLE_RANGES[field];
  if (Number.isFinite(value) && value >= min && value <= max) {
    return null;
  }
  return { message: `${field} must be between ${min} and ${max}`, field, min, max };
}
