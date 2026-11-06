import type { ExerciseProgressSummary } from '@workout/domain';

export function normalizeExerciseQuery(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase().trim();
}

export function searchTrainedExercises(exercises: ExerciseProgressSummary[], query: string, locale: string) {
  const needle = normalizeExerciseQuery(query);
  return exercises.filter((exercise) => [exercise.exerciseName, ...(exercise.searchNames ?? [])]
    .some((name) => normalizeExerciseQuery(name).includes(needle)))
    .slice().sort((a, b) => (b.lastPerformedAt ?? '').localeCompare(a.lastPerformedAt ?? '') ||
      a.exerciseName.localeCompare(b.exerciseName, locale) || a.exerciseId.localeCompare(b.exerciseId));
}
