import type { WeightUnit } from '@workout/domain';

/**
 * Lengths (height, body circumferences) are stored canonically in centimetres
 * across the domain/API, like weight in kg (spec 0027 FR-7). They follow the
 * one unit preference: cm with kg, inches with lb. Convert only at the edges.
 */
const CM_PER_IN = 2.54;

export type LengthUnit = 'cm' | 'in';

/** The length unit that goes with the user's weight unit. */
export function lengthUnitFor(unit: WeightUnit): LengthUnit {
  return unit === 'lb' ? 'in' : 'cm';
}

/** Canonical cm → the display unit (cm or in). */
export function fromCm(cm: number, unit: WeightUnit): number {
  return unit === 'lb' ? cm / CM_PER_IN : cm;
}

/** A value in the display unit (cm or in) → canonical cm. */
export function toCm(value: number, unit: WeightUnit): number {
  return unit === 'lb' ? value * CM_PER_IN : value;
}

function roundOne(value: number): number {
  return Math.round(value * 10) / 10;
}

/** e.g. `'88 cm'` / `'34.6 in'`. */
export function formatLength(cm: number, unit: WeightUnit): string {
  return `${roundOne(fromCm(cm, unit))} ${lengthUnitFor(unit)}`;
}

/** cm → whole feet and inches, rounded to the nearest inch (180 → 5 ft 11 in). */
export function cmToFeetInches(cm: number): { feet: number; inches: number } {
  const totalInches = Math.round(cm / CM_PER_IN);
  return { feet: Math.floor(totalInches / 12), inches: totalInches % 12 };
}

export function feetInchesToCm(feet: number, inches: number): number {
  return (feet * 12 + inches) * CM_PER_IN;
}

/** Height for display: `'180 cm'`, or `'5 ft 11 in'` when the unit is lb. */
export function formatHeight(cm: number, unit: WeightUnit): string {
  if (unit !== 'lb') {
    return `${roundOne(cm)} cm`;
  }
  const { feet, inches } = cmToFeetInches(cm);
  return `${feet} ft ${inches} in`;
}
