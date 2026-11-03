import { pathToFileURL } from 'node:url';
import type { Prisma } from '@prisma/client';

import { prisma } from '../infrastructure/prisma.js';

const LEGACY_PUBLIC_ID = 'user-development';

/** Runs inside one serializable transaction; dry-run never writes. */
export async function reassignDevelopmentUser(
  tx: Prisma.TransactionClient,
  targetPublicId: string,
  apply: boolean,
) {
  if (!targetPublicId || targetPublicId === LEGACY_PUBLIC_ID) {
    throw new Error('Choose a real target account with --to <public-id>');
  }
  const target = await tx.user.findUnique({ where: { publicId: targetPublicId } });
  if (!target) throw new Error('Target account does not exist');
  const legacy = await tx.user.findUnique({ where: { publicId: LEGACY_PUBLIC_ID } });
  if (!legacy) return { status: 'nothing-to-do' as const };
  if (await tx.userIdentity.count({ where: { userId: legacy.id } })) {
    throw new Error('Legacy account has sign-in identities; resolve them before reassigning');
  }
  const where = { userId: legacy.id };
  const [routines, workouts, exercises, favorites, measurements, targetWorkouts, targetFavorites] = await Promise.all([
    tx.routine.findMany({ where, select: { id: true } }),
    tx.workoutSession.findMany({ where, select: { id: true, clientId: true } }),
    tx.exercise.findMany({ where: { createdByUserId: legacy.id }, select: { id: true } }),
    tx.exerciseFavorite.findMany({ where, select: { id: true, exerciseId: true } }),
    tx.bodyMeasurement.findMany({ where, select: { id: true } }),
    tx.workoutSession.findMany({ where: { userId: target.id }, select: { clientId: true } }),
    tx.exerciseFavorite.findMany({ where: { userId: target.id }, select: { exerciseId: true } }),
  ]);
  const targetClientIds = new Set(targetWorkouts.map((row) => row.clientId).filter(Boolean));
  if (workouts.some((row) => row.clientId && targetClientIds.has(row.clientId))) {
    throw new Error('Workout clientId collision; no data has been moved');
  }
  const favoriteIds = new Set(targetFavorites.map((row) => row.exerciseId));
  const duplicateFavorites = favorites.filter((row) => favoriteIds.has(row.exerciseId)).map((row) => row.id);
  const report = {
    status: apply ? 'applied' : 'dry-run',
    source: LEGACY_PUBLIC_ID,
    target: targetPublicId,
    moved: {
      routines: routines.map((row) => row.id),
      workouts: workouts.map((row) => row.id),
      exercises: exercises.map((row) => row.id),
      favorites: favorites.filter((row) => !favoriteIds.has(row.exerciseId)).map((row) => row.id),
      measurements: measurements.map((row) => row.id),
    },
    counts: {
      routines: routines.length, workouts: workouts.length, exercises: exercises.length,
      favorites: favorites.length - duplicateFavorites.length, measurements: measurements.length,
      duplicateFavorites: duplicateFavorites.length,
    },
    duplicateFavorites,
    settings: 'Target settings and profile are preserved',
  };
  if (!apply) return report;
  await tx.routine.updateMany({ where, data: { userId: target.id } });
  await tx.workoutSession.updateMany({ where, data: { userId: target.id } });
  await tx.exercise.updateMany({ where: { createdByUserId: legacy.id }, data: { createdByUserId: target.id } });
  await tx.bodyMeasurement.updateMany({ where, data: { userId: target.id } });
  await tx.exerciseFavorite.deleteMany({ where: { id: { in: duplicateFavorites } } });
  await tx.exerciseFavorite.updateMany({ where, data: { userId: target.id } });
  const remaining = await Promise.all([
    tx.routine.count({ where }), tx.workoutSession.count({ where }),
    tx.exercise.count({ where: { createdByUserId: legacy.id } }),
    tx.exerciseFavorite.count({ where }), tx.bodyMeasurement.count({ where }),
  ]);
  if (remaining.some((count) => count !== 0)) {
    throw new Error('Unmapped legacy records remain; transaction will roll back');
  }
  await tx.user.delete({ where: { id: legacy.id } });
  return report;
}

async function main() {
  const args = process.argv.slice(2);
  const targetIndex = args.indexOf('--to');
  const target = targetIndex >= 0 ? args[targetIndex + 1] : undefined;
  const unexpected = args.filter((arg, index) =>
    !['--to', '--apply', '--dry-run'].includes(arg) && index !== targetIndex + 1,
  );
  if (!target || target.startsWith('--') || unexpected.length ||
      (args.includes('--apply') && args.includes('--dry-run'))) {
    throw new Error('Usage: reassign-dev-user --to <public-id> [--dry-run | --apply]');
  }
  const report = await prisma.$transaction(
    (tx) => reassignDevelopmentUser(tx, target, args.includes('--apply')),
    { isolationLevel: 'Serializable' },
  );
  console.log(JSON.stringify(report, (_key, value: unknown) =>
    typeof value === 'bigint' ? value.toString() : value, 2));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : 'Reassignment failed');
    process.exitCode = 1;
  }).finally(() => prisma.$disconnect());
}
