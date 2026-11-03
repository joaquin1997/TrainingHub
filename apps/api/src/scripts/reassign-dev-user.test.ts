import type { Prisma } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../infrastructure/prisma.js', () => ({ prisma: {} }));
import { reassignDevelopmentUser } from './reassign-dev-user.js';

function table(rows: object[] = []) {
  return {
    findMany: vi.fn(async () => rows), count: vi.fn(async () => 0),
    updateMany: vi.fn(async () => ({ count: rows.length })),
    deleteMany: vi.fn(async () => ({ count: 0 })),
  };
}
function database() {
  return {
    user: {
      findUnique: vi.fn(async ({ where }: { where: { publicId: string } }) =>
        where.publicId === 'owner' ? { id: 2n } : { id: 1n }),
      delete: vi.fn(),
    },
    userIdentity: { count: vi.fn(async () => 0) },
    routine: table([{ id: 11n }]),
    workoutSession: table([{ id: 21n, clientId: 'legacy-session' }]),
    exercise: table([{ id: 31n }]),
    bodyMeasurement: table([{ id: 41n }]),
    exerciseFavorite: table([{ id: 51n, exerciseId: 31n }, { id: 52n, exerciseId: 32n }]),
  };
}
let db: ReturnType<typeof database>;
const tx = () => db as unknown as Prisma.TransactionClient;
beforeEach(() => {
  db = database();
  db.workoutSession.findMany.mockResolvedValueOnce([{ id: 21n, clientId: 'legacy-session' }])
    .mockResolvedValueOnce([{ id: 22n, clientId: 'owner-session' }]);
  db.exerciseFavorite.findMany.mockResolvedValueOnce([{ id: 51n, exerciseId: 31n }, { id: 52n, exerciseId: 32n }])
    .mockResolvedValueOnce([{ id: 53n, exerciseId: 31n }]);
});

describe('legacy data reassignment (0001)', () => {
  it('reports ids without writing in dry-run mode', async () => {
    const report = await reassignDevelopmentUser(tx(), 'owner', false);
    expect(report).toMatchObject({ status: 'dry-run', moved: {
      routines: [11n], workouts: [21n], exercises: [31n], measurements: [41n], favorites: [52n],
    }, duplicateFavorites: [51n] });
    for (const name of ['routine', 'workoutSession', 'exercise', 'bodyMeasurement', 'exerciseFavorite'] as const) {
      expect(db[name].updateMany).not.toHaveBeenCalled();
      expect(db[name].deleteMany).not.toHaveBeenCalled();
    }
    expect(db.user.delete).not.toHaveBeenCalled();
  });

  it('moves every owned relation, deduplicates favorites, then deletes the empty legacy account', async () => {
    await reassignDevelopmentUser(tx(), 'owner', true);
    for (const name of ['routine', 'workoutSession', 'bodyMeasurement', 'exerciseFavorite'] as const) {
      expect(db[name].updateMany).toHaveBeenCalledWith({ where: { userId: 1n }, data: { userId: 2n } });
    }
    expect(db.exercise.updateMany).toHaveBeenCalledWith({ where: { createdByUserId: 1n }, data: { createdByUserId: 2n } });
    expect(db.exerciseFavorite.deleteMany).toHaveBeenCalledWith({ where: { id: { in: [51n] } } });
    expect(db.user.delete).toHaveBeenCalledWith({ where: { id: 1n } });
  });

  it('fails before writing on a workout identity collision', async () => {
    db.workoutSession.findMany.mockReset().mockResolvedValue([{ id: 21n, clientId: 'collision' }]);
    await expect(reassignDevelopmentUser(tx(), 'owner', true)).rejects.toThrow('collision');
    expect(db.routine.updateMany).not.toHaveBeenCalled();
    expect(db.user.delete).not.toHaveBeenCalled();
  });

  it('refuses to delete an account while ownership remains unmapped', async () => {
    db.bodyMeasurement.count.mockResolvedValue(1);
    await expect(reassignDevelopmentUser(tx(), 'owner', true)).rejects.toThrow('Unmapped');
    expect(db.user.delete).not.toHaveBeenCalled();
  });

  it('is idempotent when the legacy account is already gone', async () => {
    db.user.findUnique.mockResolvedValueOnce({ id: 2n }).mockResolvedValueOnce(null as never);
    expect(await reassignDevelopmentUser(tx(), 'owner', true)).toEqual({ status: 'nothing-to-do' });
    expect(db.user.delete).not.toHaveBeenCalled();
  });

  it('refuses an unknown target or a legacy account with linked sign-in identities', async () => {
    db.user.findUnique.mockResolvedValueOnce(null as never);
    await expect(reassignDevelopmentUser(tx(), 'owner', true)).rejects.toThrow('Target account');
    db.userIdentity.count.mockResolvedValue(1);
    await expect(reassignDevelopmentUser(tx(), 'owner', true)).rejects.toThrow('sign-in identities');
    expect(db.user.delete).not.toHaveBeenCalled();
  });
});
