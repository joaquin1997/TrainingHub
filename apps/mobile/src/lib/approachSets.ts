import type { ApproachSetCount, ExerciseLoadingKind, WeightUnit } from '@workout/domain';

export type ApproachSet = { weight: number; reps: number };
export type WarmUpRampOptions = {
  loadingKind: ExerciseLoadingKind;
  isEzBar?: boolean;
  muscleSize?: 'large' | 'small';
  alreadyWorked?: boolean;
  count?: ApproachSetCount | null;
  /** Increment in the captured display unit; persisted preferences use kg. */
  increment?: number;
};
export const EMPTY_BAR: Record<WeightUnit, number> = { kg: 20, lb: 45 };
export const LOADABLE_STEP: Record<WeightUnit, number> = { kg: 2.5, lb: 5 };
const SCHEMES: Record<ApproachSetCount, ReadonlyArray<readonly [number, number]>> = {
  1: [[0.6, 6]],
  2: [[0.5, 8], [0.75, 4]],
  3: [[0.5, 8], [0.7, 5], [0.85, 2]],
  4: [[0.4, 8], [0.6, 5], [0.75, 3], [0.9, 1]],
  5: [[0.4, 10], [0.5, 8], [0.6, 5], [0.75, 3], [0.9, 1]],
};
const BAR_SCHEME: ReadonlyArray<readonly [number, number]> = [[0, 10], [0.4, 5], [0.6, 3], [0.75, 2], [0.9, 1]];
const EPSILON = 1e-7;

export function warmUpIncrement(unit: WeightUnit, options: WarmUpRampOptions): number {
  return options.increment ?? (options.loadingKind === 'machine' ? (unit === 'kg' ? 5 : 10) : LOADABLE_STEP[unit]);
}
export function requestedApproachCount(options: WarmUpRampOptions): ApproachSetCount {
  if (options.count != null) return options.count;
  if (options.muscleSize === 'small') return options.alreadyWorked ? 1 : 2;
  return options.alreadyWorked ? 2 : options.loadingKind === 'barbell' ? 5 : 3;
}

/** Backwards-compatible barbell helper; generation uses the configured step. */
export function roundToLoadable(weight: number, unit: WeightUnit): number {
  return Math.max(EMPTY_BAR[unit], Math.round(weight / LOADABLE_STEP[unit]) * LOADABLE_STEP[unit]);
}

/** Strictly increasing, loadable approach weights below the working target. */
export function approachSets(
  workingWeight: number,
  unit: WeightUnit,
  options: WarmUpRampOptions = { loadingKind: 'barbell' },
): ApproachSet[] {
  const count = requestedApproachCount(options);
  const step = warmUpIncrement(unit, options);
  if (!Number.isFinite(workingWeight) || workingWeight <= 0 || !Number.isFinite(step) || step <= 0 || !SCHEMES[count]) return [];
  const bar = options.loadingKind === 'barbell'
    ? options.isEzBar ? (unit === 'kg' ? 10 : 25) : EMPTY_BAR[unit]
    : 0;
  const scheme = options.loadingKind === 'barbell' && count === 5 ? BAR_SCHEME : SCHEMES[count];
  const sets: ApproachSet[] = [];
  for (const [share, reps] of scheme) {
    const rounded = Math.round((workingWeight * share) / step) * step;
    const weight = Number(Math.max(bar, rounded).toFixed(8));
    if (weight <= 0 || weight > workingWeight - step + EPSILON) continue;
    const previous = sets.at(-1);
    if (previous && weight < previous.weight + step - EPSILON) continue;
    sets.push({ weight, reps });
  }
  return sets;
}
