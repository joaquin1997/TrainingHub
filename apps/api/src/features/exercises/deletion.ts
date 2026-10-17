import type { Prisma } from '@prisma/client';

import type { ExerciseAccess } from './visibility.js';

/**
 * Deleting a custom exercise (spec 0033). Written as pure decisions so the
 * rules are tested without a database; the repository only carries them out.
 */

export type ExerciseDeletionPlan =
  /** Unknown, or someone else's custom exercise: answered like unknown (FR-2, EF-3). */
  | 'not-found'
  /** A catalog exercise: it exists for everyone and is nobody's to delete (FR-2). */
  | 'forbidden'
  /** Its creator already deleted it, e.g. from another device: done (EF-2). */
  | 'already-deleted'
  /** Nothing points at it: removed outright, with its photo and favourites. */
  | 'remove'
  /** Routines, saved workouts or the active workout contain it: hidden, kept for them. */
  | 'archive';

export function planExerciseDeletion(input: {
  /** How the exercise relates to the person, ignoring its lifecycle; `missing` when unknown. */
  access: ExerciseAccess | 'missing';
  isDeleted: boolean;
  /** Any routine slot or saved workout exercise — anyone's — points at it. */
  isReferenced: boolean;
  /** The person's active workout (on their device) contains it (FR-8). */
  inActiveWorkout: boolean;
}): ExerciseDeletionPlan {
  if (input.access === 'missing' || input.access === 'hidden') {
    return 'not-found';
  }

  if (input.access === 'catalog') {
    return 'forbidden';
  }

  if (input.isDeleted) {
    return 'already-deleted';
  }

  return input.isReferenced || input.inActiveWorkout ? 'archive' : 'remove';
}

/**
 * The routines and saved workouts the impact counts: the person's own, and
 * only those containing this exercise. Never anyone else's (spec assumption:
 * their counts would leak their data).
 */
export function deletionImpactWhere(
  userPublicId: string,
  exerciseId: bigint,
): { routines: Prisma.RoutineWhereInput; workouts: Prisma.WorkoutSessionWhereInput } {
  return {
    routines: {
      user: { publicId: userPublicId },
      exercises: { some: { exerciseId } },
    },
    workouts: {
      user: { publicId: userPublicId },
      exercises: { some: { exerciseId } },
    },
  };
}

/** The `inActiveWorkout` query flag of `DELETE /exercises/:id`: only `true` / `1` set it. */
export function parseInActiveWorkoutFlag(value: unknown): boolean {
  return value === 'true' || value === '1';
}
