import { Prisma, type PrismaClient } from '@prisma/client';
import type { ExerciseWarmUpPreferences } from '@workout/domain';

import { prisma } from '../../infrastructure/prisma.js';
import { visibleExerciseWhere } from './visibility.js';

const defaults: ExerciseWarmUpPreferences = {
  loadingKind: null, approachSetCount: null, incrementKg: null,
};

/** User identity is resolved by auth; the write never changes the catalog. */
export async function exerciseWarmUpPreferences(
  userPublicId: string,
  exercisePublicId: string,
  input?: ExerciseWarmUpPreferences,
  db: PrismaClient = prisma,
): Promise<ExerciseWarmUpPreferences | null> {
  return db.$transaction(async (tx) => {
    const where = { publicId: exercisePublicId, ...visibleExerciseWhere(userPublicId) };
    const exercise = await tx.exercise.findFirst({ where, select: { id: true } });
    if (!exercise) return null;
    // Recheck after locking: a concurrent retirement/ownership change cannot
    // grant a preference write for an exercise that is no longer accessible.
    await tx.$queryRaw(Prisma.sql`SELECT id FROM "Exercise" WHERE id = ${exercise.id} FOR SHARE`);
    if (!(await tx.exercise.findFirst({ where, select: { id: true } }))) return null;
    const user = await tx.user.findUnique({ where: { publicId: userPublicId }, select: { id: true } });
    if (!user) return null;
    const key = { userId_exerciseId: { userId: user.id, exerciseId: exercise.id } };
    const row = input
      ? await tx.exerciseWarmUpPreference.upsert({
          where: key,
          create: { userId: user.id, exerciseId: exercise.id, ...input },
          update: input,
        })
      : await tx.exerciseWarmUpPreference.findUnique({ where: key });
    if (!row) return { ...defaults };
    return {
      loadingKind: row.loadingKind as ExerciseWarmUpPreferences['loadingKind'],
      approachSetCount: row.approachSetCount as ExerciseWarmUpPreferences['approachSetCount'],
      incrementKg: row.incrementKg,
    };
  });
}
