import type { WeightUnit } from '@workout/domain';

/**
 * Weight is stored canonically in kilograms across the domain/API. The UI lets
 * the user pick a display unit (kg or lb); these helpers convert between the
 * canonical kg value and the user-facing unit, and format it for display.
 */
const KG_PER_LB = 0.45359237;

/** Canonical kg → the user's display unit. */
export function fromKg(kg: number, unit: WeightUnit): number {
  return unit === 'lb' ? kg / KG_PER_LB : kg;
}

/** A value in the user's display unit → canonical kg. */
export function toKg(value: number, unit: WeightUnit): number {
  return unit === 'lb' ? value * KG_PER_LB : value;
}

/** Rounds to a sensible display precision (one decimal), trimming the noise. */
export function roundWeight(value: number): number {
  return Math.round(value * 10) / 10;
}

/**
 * kg → an input/placeholder string in the display unit (e.g. `'132.3'`).
 * Integers stay clean (`50` → `'50'`).
 */
export function kgToInputString(kg: number, unit: WeightUnit): string {
  return String(roundWeight(fromKg(kg, unit)));
}

/** Short unit label, e.g. `'kg'` / `'lb'`. */
export function unitLabel(unit: WeightUnit): string {
  return unit;
}

/**
 * Formats a canonical kg value for display in the user's unit, with the unit
 * label (e.g. `'132.3 lb'`). Missing values render as an en dash.
 */
export function formatWeight(
  kg: number | null | undefined,
  unit: WeightUnit,
): string {
  if (kg === null || kg === undefined) {
    return '–';
  }
  return `${roundWeight(fromKg(kg, unit))} ${unit}`;
}

/** Like {@link formatWeight} but value-only (no unit label). */
export function formatWeightValue(
  kg: number | null | undefined,
  unit: WeightUnit,
): string {
  if (kg === null || kg === undefined) {
    return '–';
  }
  return String(roundWeight(fromKg(kg, unit)));
}
