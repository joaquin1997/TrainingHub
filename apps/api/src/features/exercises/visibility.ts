import type { Prisma } from '@prisma/client';

/**
 * Who can see and use an exercise (spec 0015). Catalog (system) exercises are
 * visible to everyone; a custom exercise only to its creator. An exercise
 * whose creator no longer exists is visible to nobody (EF-3).
 *
 * Written once here so every query applies the same rule.
 */

/** Exercises the person can see: the catalog plus their own custom ones. */
export function visibleExerciseWhere(userPublicId: string): Prisma.ExerciseWhereInput {
  return {
    OR: [
      { isSystemDefined: true },
      { isSystemDefined: false, createdByUser: { publicId: userPublicId } },
    ],
  };
}

/**
 * Exercises the person can put in a routine or a saved workout: the visible
 * ones plus **held** ones — someone else's custom exercise that one of the
 * person's routines or saved workouts already contains (FR-7). Held is
 * derived from the person's own data, never stored (spec assumption).
 */
export function usableExerciseWhere(userPublicId: string): Prisma.ExerciseWhereInput {
  return {
    OR: [
      ...(visibleExerciseWhere(userPublicId).OR as Prisma.ExerciseWhereInput[]),
      { routineExercises: { some: { routine: { user: { publicId: userPublicId } } } } },
      {
        workoutExercises: {
          some: { workoutSession: { user: { publicId: userPublicId } } },
        },
      },
    ],
  };
}

export type ExerciseAccess = 'catalog' | 'own' | 'hidden';

/**
 * How an exercise relates to the person: a catalog one (exists for everyone,
 * maybe not editable), their own, or hidden — someone else's custom exercise,
 * which must answer exactly like one that does not exist (FR-2).
 */
export function classifyExerciseAccess(
  exercise: { isSystemDefined: boolean; creatorPublicId?: string | null },
  userPublicId: string,
): ExerciseAccess {
  if (exercise.isSystemDefined) {
    return 'catalog';
  }

  return exercise.creatorPublicId && exercise.creatorPublicId === userPublicId
    ? 'own'
    : 'hidden';
}
