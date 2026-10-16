import type { CreateWorkoutSessionInput } from '@workout/domain';

/**
 * Pure decisions about the references a saved workout makes (spec 0014). The
 * repository looks up which of them exist and belong to the user; these
 * helpers decide what to keep, so the rule is unit-tested without a database.
 */

/** A saved workout refers to an exercise that does not exist. */
export class UnknownExerciseError extends Error {
  constructor(readonly exerciseId: string) {
    super(`Unknown exercise ${exerciseId}`);
    this.name = 'UnknownExerciseError';
  }
}

export interface WorkoutReferences {
  routineId?: string;
  routineExerciseIds: string[];
  exerciseIds: string[];
}

/** Every public id the workout points at, de-duplicated. */
export function referencedIds(input: CreateWorkoutSessionInput): WorkoutReferences {
  const routineExerciseIds = input.exercises.flatMap((exercise) =>
    exercise.routineExerciseId ? [exercise.routineExerciseId] : [],
  );

  return {
    routineId: input.routineId,
    routineExerciseIds: [...new Set(routineExerciseIds)],
    exerciseIds: [...new Set(input.exercises.map((exercise) => exercise.exerciseId))],
  };
}

/**
 * Routine and routine-slot links are optional provenance: kept only when they
 * point at the user's own existing records, dropped otherwise. The workout
 * itself is never refused for them.
 */
export function dropForeignLinks(
  input: CreateWorkoutSessionInput,
  owned: { routineIds: ReadonlySet<string>; routineExerciseIds: ReadonlySet<string> },
): CreateWorkoutSessionInput {
  return {
    ...input,
    routineId:
      input.routineId && owned.routineIds.has(input.routineId)
        ? input.routineId
        : undefined,
    exercises: input.exercises.map((exercise) => ({
      ...exercise,
      routineExerciseId:
        exercise.routineExerciseId &&
        owned.routineExerciseIds.has(exercise.routineExerciseId)
          ? exercise.routineExerciseId
          : undefined,
    })),
  };
}

/** The first exercise the workout refers to that does not exist, if any. */
export function findUnknownExercise(
  input: CreateWorkoutSessionInput,
  knownExerciseIds: ReadonlySet<string>,
): string | undefined {
  return input.exercises.find((exercise) => !knownExerciseIds.has(exercise.exerciseId))
    ?.exerciseId;
}
