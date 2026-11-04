import { createHash } from 'node:crypto';
import { Prisma, type PrismaClient } from '@prisma/client';
import { correctionSetProblem, type UpdateWorkoutSessionInput } from '@workout/domain';
import { isLegacySession, isPerformedSet } from './performedSets.js';
import { prisma } from '../../infrastructure/prisma.js';
import { mapWorkoutSession, workoutSessionInclude } from './repository.js';
export class WorkoutCorrectionError extends Error {
  constructor(readonly status: 400 | 404 | 409, readonly currentRevision?: number) { super('Workout correction rejected'); }
}
function payloadHash(input: UpdateWorkoutSessionInput) {
  const canonical = { expectedRevision: input.expectedRevision, notes: input.notes, exercises: input.exercises.map((exercise) => ({
    id: exercise.id, notes: exercise.notes, sets: exercise.sets.map((set) => ({ id: set.id, type: set.type, performed: set.performed,
      reps: set.reps, repsLeft: set.repsLeft, repsRight: set.repsRight, weightKg: set.weightKg,
      durationSeconds: set.durationSeconds, distanceMeters: set.distanceMeters })).sort((a, b) => a.id.localeCompare(b.id)),
  })).sort((a, b) => a.id.localeCompare(b.id)) };
  return createHash('sha256').update(JSON.stringify(canonical)).digest('hex');
}
/** One owner-scoped transaction: lock by conditional revision increment before scalar writes. */
export async function correctWorkoutSession(userId: string, workoutId: string, input: UpdateWorkoutSessionInput, db: PrismaClient = prisma) {
  const hash = payloadHash(input);
  return db.$transaction(async (tx) => {
    const session = await tx.workoutSession.findFirst({ where: { publicId: workoutId, user: { publicId: userId } }, include: workoutSessionInclude });
    if (!session) throw new WorkoutCorrectionError(404);
    if (session.lastCorrectionMutationId === input.mutationId) {
      if (session.lastCorrectionPayloadHash === hash && session.revision === input.expectedRevision + 1) return mapWorkoutSession(userId, session);
      throw new WorkoutCorrectionError(409, session.revision);
    }
    if (session.revision !== input.expectedRevision) throw new WorkoutCorrectionError(409, session.revision);
    if (input.exercises.length !== session.exercises.length) throw new WorkoutCorrectionError(400);
    const legacy = isLegacySession(session.exercises.flatMap((exercise) => exercise.sets));
    const seen = new Set<string>();
    for (const exercise of input.exercises) {
      const saved = session.exercises.find((row) => row.publicId === exercise.id);
      if (!saved || seen.has(exercise.id) || exercise.sets.length !== saved.sets.length) throw new WorkoutCorrectionError(400);
      seen.add(exercise.id);
      const setIds = new Set<string>();
      for (const set of exercise.sets) {
        const old = saved.sets.find((row) => row.publicId === set.id);
        if (!old || setIds.has(set.id) || correctionSetProblem(set, old, saved.sets, isPerformedSet(old, legacy))) throw new WorkoutCorrectionError(400);
        setIds.add(set.id);
      }
    }
    if (!input.exercises.some((exercise) => exercise.sets.some((set) => set.performed))) throw new WorkoutCorrectionError(400);
    const updated = await tx.workoutSession.updateMany({
      where: { id: session.id, user: { publicId: userId }, revision: input.expectedRevision },
      data: { revision: { increment: 1 }, lastCorrectionMutationId: input.mutationId, lastCorrectionPayloadHash: hash, notes: input.notes },
    });
    if (updated.count !== 1) {
      const current = await tx.workoutSession.findUniqueOrThrow({ where: { id: session.id } });
      // An overlapping identical retry can observe the preceding transaction after its lock releases.
      if (current.lastCorrectionMutationId === input.mutationId && current.lastCorrectionPayloadHash === hash && current.revision === input.expectedRevision + 1) {
        const result = await tx.workoutSession.findUniqueOrThrow({ where: { id: session.id }, include: workoutSessionInclude });
        return mapWorkoutSession(userId, result);
      }
      throw new WorkoutCorrectionError(409, current.revision);
    }
    for (const exercise of input.exercises) {
      const old = session.exercises.find((row) => row.publicId === exercise.id)!;
      await tx.workoutExercise.update({ where: { id: old.id }, data: { notes: exercise.notes } });
      for (const set of exercise.sets) {
        const saved = old.sets.find((row) => row.publicId === set.id)!;
        await tx.workoutSet.update({ where: { id: saved.id }, data: {
          type: set.type, isWarmup: set.type === 'warmup', reps: set.reps, repsLeft: set.repsLeft, repsRight: set.repsRight,
          weightKg: set.weightKg, durationSeconds: set.durationSeconds, distanceMeters: set.distanceMeters,
          completedAt: set.performed ? (saved.completedAt ?? session.completedAt ?? session.startedAt) : null,
        } });
      }
    }
    return mapWorkoutSession(userId, await tx.workoutSession.findUniqueOrThrow({ where: { id: session.id }, include: workoutSessionInclude }));
  }, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted });
}
