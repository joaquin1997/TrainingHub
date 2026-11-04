import { PrismaClient } from '@prisma/client';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { UpdateWorkoutSessionInput } from '@workout/domain';
import { correctWorkoutSession } from './correctionsRepository.js';
import { buildSessionRecords, selectPerformedWork } from '../progress/aggregate.js';
const url = process.env.TRAININGHUB_TEST_DATABASE_URL;
const db = url ? new PrismaClient({ datasources: { db: { url } } }) : null;
const prefix = `correction-${Date.now()}`;
const owner = `${prefix}-owner`;
let userId: bigint, exerciseId: bigint;
async function fixture(legacy = false) {
  return db!.workoutSession.create({ data: { userId, status: 'completed', clientId: `${prefix}-${Math.random()}`,
    startedAt: new Date('2026-11-01T09:00:00Z'), completedAt: new Date('2026-11-01T10:00:00Z'), pausedSeconds: 15,
    exercises: { create: { exerciseId, order: 1, sets: { create: [1, 2].map((order) => ({ order, reps: 5, weightKg: 100, completedAt: legacy || order === 2 ? null : new Date('2026-11-01T09:30:00Z') })) } } },
  }, include: { exercises: { include: { sets: true } } } });
}
function input(session: Awaited<ReturnType<typeof fixture>>, mutationId = `m-${Math.random()}`): UpdateWorkoutSessionInput {
  const legacy = !session.exercises.some((exercise) => exercise.sets.some((set) => set.completedAt));
  return { expectedRevision: session.revision, mutationId, notes: 'corrected', exercises: session.exercises.map((exercise) => ({
    id: exercise.publicId, notes: 'exercise note', sets: exercise.sets.map((set) => ({
      id: set.publicId, type: 'normal', performed: legacy || !!set.completedAt, reps: set.reps,
      repsLeft: set.repsLeft, repsRight: set.repsRight, weightKg: 10, durationSeconds: set.durationSeconds, distanceMeters: set.distanceMeters,
    })),
  })) };
}
describe.skipIf(!db)('0050 atomic corrections against isolated PostgreSQL', () => {
  beforeAll(async () => {
    userId = (await db!.user.create({ data: { publicId: owner, displayName: 'Synthetic owner' } })).id;
    exerciseId = (await db!.exercise.create({ data: { publicId: prefix, source: prefix, sourceId: prefix, name: 'Synthetic lift', equipment: [] } })).id;
  });
  afterAll(async () => {
    await db!.user.deleteMany({ where: { publicId: owner } });
    await db!.exercise.deleteMany({ where: { source: prefix } });
    await db!.$disconnect();
  });
  it('updates scalars without changing identity/time/order/client identity and retries idempotently', async () => {
    const original = await fixture(); const change = input(original, 'same-mutation');
    const saved = await correctWorkoutSession(owner, original.publicId, change, db!);
    expect(saved.revision).toBe(1); expect(saved.exercises[0]!.sets[0]!.weightKg).toBe(10);
    expect(saved.startedAt).toBe(original.startedAt.toISOString()); expect(saved.pausedSeconds).toBe(15);
    expect(saved.exercises[0]!.sets[0]!.completedAt).toBe(original.exercises[0]!.sets[0]!.completedAt!.toISOString());
    const replay = await correctWorkoutSession(owner, original.publicId, change, db!);
    expect(replay).toEqual(saved);
    expect((await db!.workoutSession.findUniqueOrThrow({ where: { id: original.id } })).clientId).toBe(original.clientId);
    await expect(correctWorkoutSession(owner, original.publicId, { ...change, notes: 'different' }, db!)).rejects.toMatchObject({ status: 409 });
  });
  it('allows exactly one of two revision-matched writers and rejects a superseded mutation retry', async () => {
    const original = await fixture(); const a = input(original), b = input(original);
    const results = await Promise.allSettled([correctWorkoutSession(owner, original.publicId, a, db!), correctWorkoutSession(owner, original.publicId, b, db!)]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(results.find((r) => r.status === 'rejected')).toMatchObject({ reason: { status: 409 } });
    const winner = results[0]!.status === 'fulfilled' ? a : b;
    await correctWorkoutSession(owner, original.publicId, { ...winner, expectedRevision: 1, mutationId: 'later' }, db!);
    await expect(correctWorkoutSession(owner, original.publicId, winner, db!)).rejects.toMatchObject({ status: 409 });
  });
  it('returns one revision for two overlapping identical retries', async () => {
    const original = await fixture(); const change = input(original);
    const results = await Promise.all([correctWorkoutSession(owner, original.publicId, change, db!), correctWorkoutSession(owner, original.publicId, change, db!)]);
    expect(results.map((r) => r.revision)).toEqual([1, 1]);
  });
  it('normalizes legacy completion only for this session and forbids all-unperformed', async () => {
    const original = await fixture(true); const change = input(original);
    change.exercises[0]!.sets[1]!.performed = false;
    const result = await correctWorkoutSession(owner, original.publicId, change, db!);
    expect(result.exercises[0]!.sets.map((set) => set.performed)).toEqual([true, false]);
    expect(result.exercises[0]!.sets[0]!.completedAt).toBe(original.completedAt!.toISOString());
    const invalid = { ...change, expectedRevision: 1, mutationId: 'empty' };
    invalid.exercises[0]!.sets[0]!.performed = false;
    await expect(correctWorkoutSession(owner, original.publicId, invalid, db!)).rejects.toMatchObject({ status: 400 });
    expect((await db!.workoutSession.findUniqueOrThrow({ where: { id: original.id } })).revision).toBe(1);
  });
  it('rejects missing, duplicated and wrong-parent IDs and hides foreign ownership', async () => {
    const original = await fixture(); const other = await fixture(); const change = input(original);
    await expect(correctWorkoutSession('foreign', original.publicId, change, db!)).rejects.toMatchObject({ status: 404 });
    await expect(correctWorkoutSession(owner, 'missing', change, db!)).rejects.toMatchObject({ status: 404 });
    change.exercises[0]!.sets[1]!.id = other.exercises[0]!.sets[0]!.publicId;
    await expect(correctWorkoutSession(owner, original.publicId, change, db!)).rejects.toMatchObject({ status: 400 });
    change.exercises[0]!.sets[1]!.id = change.exercises[0]!.sets[0]!.id;
    await expect(correctWorkoutSession(owner, original.publicId, change, db!)).rejects.toMatchObject({ status: 400 });
    expect((await db!.workoutSession.findUniqueOrThrow({ where: { id: original.id } })).revision).toBe(0);
  });
  it('rebuilds later PRs and last performance values from the corrected preceding rows', async () => {
    const first = await fixture(); const later = await fixture();
    await db!.workoutSession.update({ where: { id: later.id }, data: { startedAt: new Date('2026-11-02T09:00:00Z'), completedAt: new Date('2026-11-02T10:00:00Z') } });
    await db!.workoutSet.updateMany({ where: { workoutExerciseId: later.exercises[0]!.id }, data: { weightKg: 50 } });
    const read = async () => {
      const rows = await db!.workoutSession.findMany({ where: { id: { in: [first.id, later.id] } }, include: { exercises: { include: { sets: true } } } });
      return buildSessionRecords(selectPerformedWork(rows.map((session) => ({ workoutId: session.publicId, date: session.startedAt.toISOString(),
        exercises: session.exercises.map((exercise) => ({ exerciseId: prefix, exerciseName: 'Lift', sets: exercise.sets })),
      }))));
    };
    const hasWeightRecord = (records: Awaited<ReturnType<typeof read>>) => records.find((r) => r.workoutId === later.publicId)?.records.some((r) => r.type === 'heaviestWeight') ?? false;
    expect(hasWeightRecord(await read())).toBe(false);
    await correctWorkoutSession(owner, first.publicId, input(first), db!);
    expect(hasWeightRecord(await read())).toBe(true);
    const corrected = await db!.workoutSet.findUniqueOrThrow({ where: { id: first.exercises[0]!.sets[0]!.id } });
    expect(corrected.weightKg).toBe(10);
  });

  it('rolls back the revision and first child if the second database write fails', async () => {
    const original = await fixture(); let writes = 0;
    const failing = db!.$extends({ query: { workoutSet: { async update({ args, query }) {
      writes += 1; if (writes === 2) throw new Error('synthetic second-write failure'); return query(args);
    } } } });
    await expect(correctWorkoutSession(owner, original.publicId, input(original), failing as unknown as PrismaClient)).rejects.toThrow('synthetic');
    const after = await db!.workoutSession.findUniqueOrThrow({ where: { id: original.id }, include: { exercises: { include: { sets: true } } } });
    expect(after.revision).toBe(0); expect(after.notes).toBeNull(); expect(after.exercises[0]!.sets.map((set) => set.weightKg)).toEqual([100, 100]);
  });
});
