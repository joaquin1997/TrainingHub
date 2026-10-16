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
