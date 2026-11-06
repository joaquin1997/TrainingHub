import type { UpdateWorkoutSessionInput, WeightUnit, WorkoutSession, WorkoutSet, WorkoutSetType } from '@workout/domain';
import { CORRECTION_QUANTITIES, correctionFields, correctionSetProblem, type CorrectionQuantity } from '@workout/domain/workoutCorrections';
import { kgToInputString, toKg } from '@/lib/weight';
import { isPerformedSet } from '../utils/performedSet';
export type CorrectionSetDraft = { id: string; type: WorkoutSetType; performed: boolean; values: Record<CorrectionQuantity, string> };
export interface WorkoutCorrectionDraft {
  ownerId: string;
  original: WorkoutSession;
  unit: WeightUnit;
  notes: string;
  exercises: Array<{ id: string; notes: string; sets: CorrectionSetDraft[] }>;
}
function initialValues(set: WorkoutSet, unit: WeightUnit): Record<CorrectionQuantity, string> {
  return Object.fromEntries(CORRECTION_QUANTITIES.map((field) => [field,
    set[field] === undefined ? '' : field === 'weightKg' ? kgToInputString(set[field], unit) : String(set[field]),
  ])) as Record<CorrectionQuantity, string>;
}
export function createCorrectionDraft(session: WorkoutSession, ownerId: string, unit: WeightUnit): WorkoutCorrectionDraft {
  return { ownerId, original: session, unit, notes: session.notes ?? '', exercises: session.exercises.map((exercise) => ({
    id: exercise.id, notes: exercise.notes ?? '', sets: exercise.sets.map((set) => ({ id: set.id,
      type: set.isWarmup ? 'warmup' : set.type, performed: isPerformedSet(set), values: initialValues(set, unit),
    })),
  })) };
}
export function correctionPayload(draft: WorkoutCorrectionDraft, mutationId: string): UpdateWorkoutSessionInput {
  if (!Number.isSafeInteger(draft.original.revision)) throw new Error('unsupported');
  if (draft.notes.length > 20_000 || draft.exercises.some((exercise) => exercise.notes.length > 20_000)) throw new Error('invalid');
  const exercises = draft.exercises.map((exercise) => {
    const saved = draft.original.exercises.find((row) => row.id === exercise.id)!;
    return { id: exercise.id, notes: exercise.notes || null, sets: exercise.sets.map((set) => {
      const original = saved.sets.find((row) => row.id === set.id)!;
      const initial = initialValues(original, draft.unit);
      const values = Object.fromEntries(CORRECTION_QUANTITIES.map((field) => {
        const text = set.values[field].trim().replace(',', '.');
        const value = text === '' ? null : Number(text);
        return [field, set.values[field] === initial[field] ? original[field] ?? null
          : field === 'weightKg' && value !== null ? toKg(value, draft.unit) : value];
      })) as Record<CorrectionQuantity, number | null>;
      if (correctionFields(original, saved.sets).includes('repsLeft')) {
        values.reps = values.repsLeft === null && values.repsRight === null ? null : (values.repsLeft ?? 0) + (values.repsRight ?? 0);
      }
      const result = { id: set.id, type: set.type, performed: set.performed, ...values };
      if (correctionSetProblem(result, original, saved.sets, isPerformedSet(original))) throw new Error('invalid');
      return result;
    }) };
  });
  if (!exercises.some((exercise) => exercise.sets.some((set) => set.performed))) throw new Error('noPerformed');
  return { expectedRevision: draft.original.revision!, mutationId, notes: draft.notes || null, exercises };
}
export function correctionIsDirty(draft: WorkoutCorrectionDraft): boolean {
  const original = createCorrectionDraft(draft.original, draft.ownerId, draft.unit);
  return draft.notes !== original.notes || JSON.stringify(draft.exercises) !== JSON.stringify(original.exercises);
}
