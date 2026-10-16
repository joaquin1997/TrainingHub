/** The part of a routine editor row that names its exercise. */
type RoutineRowExercise = {
  id: string;
  exerciseId?: string;
  exerciseQuery: string;
};

/**
 * Puts another exercise in one routine editor row (spec 0020 FR-4, FR-5).
 * Only the exercise changes: the row keeps its sets and targets, rest,
 * superset and position. Unknown row ids leave the rows as they are.
 */
export function replaceRoutineRowExercise<Row extends RoutineRowExercise>(
  rows: Row[],
  rowId: string,
  exercise: { id: string; name: string },
): Row[] {
  return rows.map((row) =>
    row.id === rowId
      ? { ...row, exerciseId: exercise.id, exerciseQuery: exercise.name }
      : row,
  );
}
