import type { WorkoutSetCorrectionInput } from './entities.js';
export const CORRECTION_QUANTITIES = ['reps', 'repsLeft', 'repsRight', 'weightKg', 'durationSeconds', 'distanceMeters'] as const;
export type CorrectionQuantity = typeof CORRECTION_QUANTITIES[number];
type Measurements = Partial<Record<CorrectionQuantity, number | null>>;

/** Saved shape wins over today's catalog; empty rows inherit a recorded sibling. */
export function correctionFields(original: Measurements, siblings: Measurements[]): CorrectionQuantity[] {
  const hasShape = (set: Measurements) => CORRECTION_QUANTITIES.some((field) => set[field] != null);
  const shape = hasShape(original) ? original : siblings.find(hasShape);
  if (!shape) return ['weightKg', 'reps'];
  const weight: CorrectionQuantity[] = shape.weightKg != null ? ['weightKg'] : [];
  if (shape.durationSeconds != null || shape.distanceMeters != null) {
    return [...weight, 'durationSeconds', ...(shape.distanceMeters != null ? ['distanceMeters' as const] : [])];
  }
  return [...weight, ...(shape.repsLeft != null || shape.repsRight != null ? ['repsLeft' as const, 'repsRight' as const] : ['reps' as const])];
}

export function correctionSetProblem(set: WorkoutSetCorrectionInput, original: Measurements, siblings: Measurements[], originalPerformed = false): boolean {
  const fields = correctionFields(original, siblings);
  for (const field of CORRECTION_QUANTITIES) {
    const value = set[field];
    if (value !== null && (!Number.isFinite(value) || value < 0 || value > 1_000_000 ||
      (['reps', 'repsLeft', 'repsRight', 'durationSeconds'].includes(field) && !Number.isInteger(value)))) return true;
    // Sided reps carry their derived total; no unrelated measurement can be introduced.
    if (!fields.includes(field) && field !== 'reps' && value !== null) return true;
    if (field === 'reps' && !fields.includes('reps') && !fields.includes('repsLeft') && value !== null) return true;
  }
  const sided = fields.includes('repsLeft');
  if (sided && set.reps !== (set.repsLeft === null && set.repsRight === null ? null : (set.repsLeft ?? 0) + (set.repsRight ?? 0))) return true;
  const unchanged = CORRECTION_QUANTITIES.every((field) => set[field] === (original[field] ?? null));
  if (set.performed && !fields.some((field) => (set[field] ?? 0) > 0) && !(originalPerformed && unchanged)) return true;
  return false;
}
