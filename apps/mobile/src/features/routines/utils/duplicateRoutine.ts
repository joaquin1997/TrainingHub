import type { CreateRoutineInput, Routine } from '@workout/domain';

/** Builds the create payload for a copy of a routine (used by Duplicate). */
export function buildRoutineCopyInput(routine: Routine): CreateRoutineInput {
  return {
    name: `${routine.name} (copy)`,
    description: routine.description,
    folder: routine.folder,
    exercises: routine.exercises
      .slice()
      .sort((left, right) => left.orderIndex - right.orderIndex)
      .map((exercise) => ({
        exerciseId: exercise.exerciseId,
        orderIndex: exercise.orderIndex,
        restSeconds: exercise.restSeconds,
        supersetGroup: exercise.supersetGroup,
        sets: exercise.sets
          .slice()
          .sort((left, right) => left.setNumber - right.setNumber)
          .map((set) => ({
            setNumber: set.setNumber,
            minReps: set.minReps,
            maxReps: set.maxReps,
            targetWeight: set.targetWeight,
            targetDurationSeconds: set.targetDurationSeconds,
            targetDistanceMeters: set.targetDistanceMeters,
          })),
      })),
  };
}
