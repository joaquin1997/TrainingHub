/**
 * Hevy-style set inheritance for the routine builder: a new set ghosts the
 * previous set's values as placeholders, and an unedited field falls back to
 * that inherited value when the routine is saved.
 */

export type NumericSetField =
  | 'minReps'
  | 'maxReps'
  | 'targetWeight'
  | 'targetDuration'
  | 'targetDistance';

export const SET_FIELD_LABELS: Record<NumericSetField, string> = {
  minReps: 'Min reps',
  maxReps: 'Max reps',
  targetWeight: 'Kg',
  targetDuration: '0:00',
  targetDistance: 'm',
};

type SetLike<F extends NumericSetField> = Record<F, string> & { isWarmup?: boolean };

/**
 * The nearest previous set's non-empty value for a field, or '' if none — what
 * a new/empty set shows as its ghosted placeholder. Warm-up and working sets
 * only inherit from their own kind (spec 0024).
 */
export function inheritedSetValue<F extends NumericSetField>(
  sets: SetLike<F>[],
  index: number,
  field: F,
): string {
  const warmup = Boolean(sets[index]?.isWarmup);
  for (let i = index - 1; i >= 0; i -= 1) {
    if (Boolean(sets[i]!.isWarmup) !== warmup) {
      continue;
    }
    const value = sets[i]![field].trim();
    if (value) {
      return value;
    }
  }

  return '';
}

/** The placeholder to display: inherited value, falling back to the field label. */
export function setFieldPlaceholder<F extends NumericSetField>(
  sets: SetLike<F>[],
  index: number,
  field: F,
): string {
  return inheritedSetValue(sets, index, field) || SET_FIELD_LABELS[field];
}

/** A set's effective value on save: its own entry, else the inherited one. */
export function effectiveRoutineSetValue<F extends NumericSetField>(
  sets: SetLike<F>[],
  index: number,
  field: F,
): string {
  return sets[index]![field].trim() || inheritedSetValue(sets, index, field);
}
