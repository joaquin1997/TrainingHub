import type { ExerciseTrackingType, WarmUpExerciseMetadata } from '@workout/domain';

/** The part of a routine editor row that names its exercise. */
type RoutineRowExercise = {
  id: string;
  exerciseId?: string;
  exerciseQuery: string;
  trackingType?: ExerciseTrackingType;
};

/**
 * Puts another exercise in one routine editor row (spec 0020 FR-4, FR-5).
 * Only the exercise changes: the row keeps its sets and targets, rest,
 * superset and position. Unknown row ids leave the rows as they are. The
 * row takes the new exercise's tracking type, so its set columns follow it
 * (spec 0021); targets of fields it does not track are not saved.
 */
export function replaceRoutineRowExercise<Row extends RoutineRowExercise>(
  rows: Row[],
  rowId: string,
  exercise: { id: string; name: string; trackingType?: ExerciseTrackingType } & WarmUpExerciseMetadata,
): Row[] {
  return rows.map((row) =>
    row.id === rowId
      ? {
          ...row,
          exerciseId: exercise.id,
          exerciseQuery: exercise.name,
          warmUpMetadata: { name: exercise.name, aliases: exercise.aliases, loadingKind: exercise.loadingKind, equipment: exercise.equipment, category: exercise.category, primaryMuscleGroups: exercise.primaryMuscleGroups },
          trackingType: exercise.trackingType,
        }
      : row,
  );
}
