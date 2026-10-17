import type { Exercise, ExerciseTrackingType } from '@workout/domain';

import { prisma } from '../../infrastructure/prisma.js';
import { findExerciseById } from './repository.js';
import { classifyExerciseAccess } from './visibility.js';

/** Who set an exercise's tracking type (spec 0030): only `system` types are swept. */
export type TrackingTypeSetBy = 'system' | 'person';

export type TrackingTypeWriteResult = Exercise | 'not-found';

/**
 * Changes an exercise's tracking type by hand (spec 0030 FR-12, FR-13), with
 * the same rule as the unilateral mark (0022): a catalog exercise can be
 * changed by anyone signed in, a custom one only by its creator (EF-6); for
 * anyone else it does not exist (spec 0015, no existence leak). The
 * type is then marked as set by a person, so no later sweep overrides it.
 * Logged sets and routine targets are never touched (FR-15, FR-18).
 *
 * Kept apart from `repository.ts` so it stays clear of spec 0015's edits.
 */
export async function setExerciseTrackingType(
  userPublicId: string,
  exercisePublicId: string,
  trackingType: ExerciseTrackingType,
): Promise<TrackingTypeWriteResult> {
  const exercise = await prisma.exercise.findUnique({
    where: { publicId: exercisePublicId },
    select: {
      id: true,
      isSystemDefined: true,
      deletedAt: true,
      createdByUser: { select: { publicId: true } },
    },
  });

  if (
    !exercise ||
    classifyExerciseAccess(
      {
        isSystemDefined: exercise.isSystemDefined,
        creatorPublicId: exercise.createdByUser?.publicId,
        // A deleted custom exercise answers like a missing one (spec 0033).
        isDeleted: exercise.deletedAt !== null && exercise.deletedAt !== undefined,
      },
      userPublicId,
    ) === 'hidden'
  ) {
    return 'not-found';
  }

  const setBy: TrackingTypeSetBy = 'person';
  await prisma.exercise.update({
    where: { id: exercise.id },
    data: { trackingType, trackingTypeSetBy: setBy },
  });

  return (await findExerciseById(userPublicId, exercisePublicId)) ?? 'not-found';
}
