import type { Routine } from '@workout/domain';

/**
 * Ordered exercise names of a routine. Operates on real domain data; lives here
 * (not under mocks/) because it is used by screens against API responses.
 */
export function getRoutineExerciseNames(routine: Routine) {
  return routine.exercises
    .slice()
    .sort((left, right) => left.orderIndex - right.orderIndex)
    .map((routineExercise) => routineExercise.exerciseName);
}

/**
 * Short, human-readable summary of a routine's exercises, e.g.
 * "Bench Press, Barbell Row +2 more".
 */
export function getRoutineExerciseSummary(routine: Routine, maxItems = 2) {
  const exerciseNames = getRoutineExerciseNames(routine);

  if (exerciseNames.length === 0) {
    return 'No exercises yet';
  }

  const visibleNames = exerciseNames.slice(0, maxItems);
  const remainingCount = exerciseNames.length - visibleNames.length;

  if (remainingCount <= 0) {
    return visibleNames.join(', ');
  }

  return `${visibleNames.join(', ')} +${remainingCount} more`;
}
