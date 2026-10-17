import type { WeightUnit } from '@workout/domain';

/**
 * Approach (warm-up) sets up to a working weight (spec 0024). Everything here
 * is in the display unit, because what can be loaded on a bar depends on it:
 * the result goes where typed weights go and is converted to kg on save.
 */
export type ApproachSet = { weight: number; reps: number };

/** The empty bar: 20 kg or 45 lb (spec assumption; configurable later). */
export const EMPTY_BAR: Record<WeightUnit, number> = { kg: 20, lb: 45 };

/** The smallest loadable increment: a pair of the smallest common plates. */
export const LOADABLE_STEP: Record<WeightUnit, number> = { kg: 2.5, lb: 5 };

/**
 * Empty bar × 10, then 40 % × 5, 60 % × 3, 75 % × 2, 90 % × 1 of the working
 * weight (spec assumption). `share: 0` stands for the empty bar.
 */
const SCHEME: readonly { share: number; reps: number }[] = [
  { share: 0, reps: 10 },
  { share: 0.4, reps: 5 },
  { share: 0.6, reps: 3 },
  { share: 0.75, reps: 2 },
  { share: 0.9, reps: 1 },
];

// Weights are multiples of 2.5 or 5; this only absorbs float noise.
const EPSILON = 1e-6;

/** Nearest multiple of the unit's loadable step, never below the bar (FR-3). */
export function roundToLoadable(weight: number, unit: WeightUnit): number {
  const step = LOADABLE_STEP[unit];
  const rounded = Math.round(weight / step) * step;
  // Two decimals at most (2.5 steps), without float tails like 57.50000001.
  return Math.max(EMPTY_BAR[unit], Math.round(rounded * 100) / 100);
}

/**
 * The approach sets for a working weight, lightest first. A step is left out
 * when it is not at least one loadable step above the previous one or below
 * the working weight, so a light working weight gets fewer sets and none is
 * ever as heavy as the working set (EF-2). At or below the bar → none.
 */
export function approachSets(workingWeight: number, unit: WeightUnit): ApproachSet[] {
  if (!Number.isFinite(workingWeight) || workingWeight <= 0) {
    return [];
  }

  const step = LOADABLE_STEP[unit];
  const ceiling = workingWeight - step + EPSILON;
  const sets: ApproachSet[] = [];

  for (const { share, reps } of SCHEME) {
    const weight = share === 0 ? EMPTY_BAR[unit] : roundToLoadable(workingWeight * share, unit);
    const previous = sets[sets.length - 1];

    if (weight > ceiling) {
      continue;
    }
    if (previous && weight < previous.weight + step - EPSILON) {
      continue;
    }

    sets.push({ weight, reps });
  }

  return sets;
}
