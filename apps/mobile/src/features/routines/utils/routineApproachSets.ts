import type { WeightUnit } from '@workout/domain';

import type { EditableRoutineSet } from '@/features/routines/components/RoutineSetTable';
import { approachSets } from '@/lib/approachSets';

import { effectiveRoutineSetValue } from './routineSetInheritance';

/** Same outcomes as in the active workout (spec 0024 EF-1, EF-2). */
export type RoutineApproachSetsOutcome = 'added' | 'noWeight' | 'tooLight';

/**
 * Adds approach sets before the first working set of a routine exercise in
 * the editor, from that set's target weight (display unit). All warm-up rows
 * ahead of it are replaced, so a second tap regenerates. Generated rows hold
 * the weight and an exact rep target (min = max).
 */
export function addRoutineApproachSets(
  sets: EditableRoutineSet[],
  unit: WeightUnit,
  createId: () => string,
): { sets: EditableRoutineSet[]; outcome: RoutineApproachSetsOutcome } {
  const firstWorking = sets.findIndex((set) => !set.isWarmup);
  if (firstWorking === -1) {
    return { sets, outcome: 'noWeight' };
  }

  const workingWeight = Number.parseFloat(
    effectiveRoutineSetValue(sets, firstWorking, 'targetWeight').replace(',', '.'),
  );
  if (!(workingWeight > 0)) {
    return { sets, outcome: 'noWeight' };
  }

  const generated = approachSets(workingWeight, unit);
  if (generated.length === 0) {
    return { sets, outcome: 'tooLight' };
  }

  const rows: EditableRoutineSet[] = generated.map((set) => ({
    id: createId(),
    minReps: String(set.reps),
    maxReps: String(set.reps),
    targetWeight: String(set.weight),
    targetDuration: '',
    targetDistance: '',
    isWarmup: true,
  }));

  return { sets: [...rows, ...sets.slice(firstWorking)], outcome: 'added' };
}

/**
 * The set column label: the warm-up letter for a warm-up, else the working
 * set's number counting working sets only ("W W 1 2 3").
 */
export function routineSetLabel(
  sets: readonly { isWarmup?: boolean }[],
  index: number,
  warmupLabel: string,
): string {
  if (sets[index]?.isWarmup) {
    return warmupLabel.charAt(0).toUpperCase();
  }

  return String(sets.slice(0, index + 1).filter((set) => !set.isWarmup).length);
}
