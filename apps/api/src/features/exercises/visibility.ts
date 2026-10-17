import type { Prisma } from '@prisma/client';

/**
 * Who can see and use an exercise (spec 0015). Catalog (system) exercises are
 * visible to everyone; a custom exercise only to its creator. An exercise
 * whose creator no longer exists is visible to nobody (EF-3).
 *
 * Written once here so every query applies the same rule.
 */

/**
 * Exercises the person can see: the catalog plus their own custom ones that
 * they have not deleted (spec 0033 FR-5). Catalog exercises are never deleted.
 */
export function visibleExerciseWhere(userPublicId: string): Prisma.ExerciseWhereInput {
  return {
    OR: [
      { isSystemDefined: true },
      {
        isSystemDefined: false,
        createdByUser: { publicId: userPublicId },
        deletedAt: null,
      },
    ],
  };
}

/**
 * Exercises the person can put in a routine or a saved workout: the catalog,
 * their own custom ones — **deleted or not**, so a routine or the active
 * workout that contains a deleted one still saves (spec 0033 FR-7, FR-8,
 * EF-5) — plus **held** ones: someone else's custom exercise that one of the
 * person's routines or saved workouts already contains (spec 0015 FR-7). Held
 * is derived from the person's own data, never stored (spec assumption).
 * Pickers read the visible list, so a deleted exercise is never offered anew.
 */
export function usableExerciseWhere(userPublicId: string): Prisma.ExerciseWhereInput {
  return {
    OR: [
      { isSystemDefined: true },
      { isSystemDefined: false, createdByUser: { publicId: userPublicId } },
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
 * which must answer exactly like one that does not exist (FR-2). A deleted
 * custom exercise (spec 0033) is hidden for everyone, its creator included,
 * when `isDeleted` is given; callers that omit it ignore the lifecycle.
 */
export function classifyExerciseAccess(
  exercise: { isSystemDefined: boolean; creatorPublicId?: string | null; isDeleted?: boolean },
  userPublicId: string,
): ExerciseAccess {
  if (exercise.isSystemDefined) {
    return 'catalog';
  }

  if (exercise.isDeleted) {
    return 'hidden';
  }

  return exercise.creatorPublicId && exercise.creatorPublicId === userPublicId
    ? 'own'
    : 'hidden';
}
