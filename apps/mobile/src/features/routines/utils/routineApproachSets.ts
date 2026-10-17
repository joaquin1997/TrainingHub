import type { WeightUnit } from '@workout/domain';

import type { EditableRoutineSet } from '@/features/routines/components/RoutineSetTable';
import { approachSets, type ApproachSet } from '@/lib/approachSets';

import { effectiveRoutineSetValue, type NumericSetField } from './routineSetInheritance';

/** Why approach rows cannot be offered (spec 0024 EF-1, EF-2; 0031 FR-5). */
export type RoutineApproachSetsNotice = 'noWeight' | 'tooLight';

/** What adding would do in the editor, before anything changes (0031 FR-13). */
export type RoutineApproachSetsPreview = {
  /** The catalog exercise previewed, to refuse a confirm after a replace (EF-1). */
  exerciseId: string;
  /** Lightest first, in the display unit. */
  sets: ApproachSet[];
  workingWeight: number;
  unit: WeightUnit;
  /** Warm-up rows already ahead of the first working row; they stay (FR-4). */
  keptWarmUps: number;
};

export type RoutineApproachSetsPreviewResult =
  | ({ outcome: 'preview' } & RoutineApproachSetsPreview)
  | { outcome: RoutineApproachSetsNotice };

/** A generated row still carrying the mark; "done" does not apply here (FR-13). */
function isGenerated(set: EditableRoutineSet) {
  return set.isWarmup === true && set.generatedWarmup === true;
}

/** Remove while a generated row remains, else add (spec 0031 FR-9, FR-11, FR-13). */
export function routineWarmUpActionFor(sets: readonly EditableRoutineSet[]): 'add' | 'remove' {
  return sets.some(isGenerated) ? 'remove' : 'add';
}

/**
 * The approach rows adding would insert, from the first working row's target
 * weight (typed or inherited, display unit). Pure: the rows are not touched
 * until the person confirms (FR-1, FR-2).
 */
export function previewRoutineApproachSets(
  sets: EditableRoutineSet[],
  exerciseId: string,
  unit: WeightUnit,
): RoutineApproachSetsPreviewResult {
  const firstWorking = sets.findIndex((set) => !set.isWarmup);
  if (firstWorking === -1) {
    return { outcome: 'noWeight' };
  }

  const workingWeight = Number.parseFloat(
    effectiveRoutineSetValue(sets, firstWorking, 'targetWeight').replace(',', '.'),
  );
  if (!(workingWeight > 0)) {
    return { outcome: 'noWeight' };
  }

  const generated = approachSets(workingWeight, unit);
  if (generated.length === 0) {
    return { outcome: 'tooLight' };
  }

  return {
    outcome: 'preview',
    exerciseId,
    sets: generated,
    workingWeight,
    unit,
    keptWarmUps: firstWorking,
  };
}

/**
 * Inserts exactly the previewed rows, marked as generated, right before the
 * first working row — after any warm-up rows already there — or at the end
 * when there is none. Nothing is replaced (FR-3, FR-4). Generated rows hold
 * the weight and an exact rep target (min = max).
 */
export function confirmRoutineApproachSets(
  sets: readonly EditableRoutineSet[],
  preview: Pick<RoutineApproachSetsPreview, 'sets'>,
  createId: () => string,
): EditableRoutineSet[] {
  const firstWorking = sets.findIndex((set) => !set.isWarmup);
  const at = firstWorking === -1 ? sets.length : firstWorking;
  const rows: EditableRoutineSet[] = preview.sets.map((set) => ({
    id: createId(),
    minReps: String(set.reps),
    maxReps: String(set.reps),
    targetWeight: String(set.weight),
    targetDuration: '',
    targetDistance: '',
    isWarmup: true,
    generatedWarmup: true,
  }));

  return [...sets.slice(0, at), ...rows, ...sets.slice(at)];
}

/** Removes every row still marked as generated; the person's rows stay (FR-10, FR-13). */
export function removeRoutineGeneratedWarmUps(
  sets: readonly EditableRoutineSet[],
): EditableRoutineSet[] {
  return sets.filter((set) => !isGenerated(set));
}

/**
 * A row after one of its values was typed: a generated row whose value
 * actually changed becomes the person's own, for good (FR-7).
 */
export function editRoutineSetValue(
  set: EditableRoutineSet,
  field: NumericSetField,
  value: string,
): EditableRoutineSet {
  return {
    ...set,
    [field]: value,
    generatedWarmup: set[field] === value ? set.generatedWarmup : undefined,
  };
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
