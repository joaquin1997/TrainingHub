/**
 * Hevy-style set inheritance for the routine builder: a new set ghosts the
 * previous set's values as placeholders, and an unedited field falls back to
 * that inherited value when the routine is saved.
 */

export type NumericSetField = 'minReps' | 'maxReps' | 'targetWeight';

export const SET_FIELD_LABELS: Record<NumericSetField, string> = {
  minReps: 'Min reps',
  maxReps: 'Max reps',
  targetWeight: 'Kg',
};

type SetLike = Record<NumericSetField, string>;

/**
 * The nearest previous set's non-empty value for a field, or '' if none — what
 * a new/empty set shows as its ghosted placeholder.
 */
export function inheritedSetValue(
  sets: SetLike[],
  index: number,
  field: NumericSetField,
): string {
  for (let i = index - 1; i >= 0; i -= 1) {
    const value = sets[i]![field].trim();
    if (value) {
      return value;
    }
  }

  return '';
}

/** The placeholder to display: inherited value, falling back to the field label. */
export function setFieldPlaceholder(
  sets: SetLike[],
  index: number,
  field: NumericSetField,
): string {
  return inheritedSetValue(sets, index, field) || SET_FIELD_LABELS[field];
}

/** A set's effective value on save: its own entry, else the inherited one. */
export function effectiveRoutineSetValue(
  sets: SetLike[],
  index: number,
  field: NumericSetField,
): string {
  return sets[index]![field].trim() || inheritedSetValue(sets, index, field);
}
