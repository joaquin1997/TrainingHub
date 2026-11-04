import { beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('../../infrastructure/prisma.js', () => ({ prisma: { workoutSession: { findMany: vi.fn() } } }));
import { prisma } from '../../infrastructure/prisma.js';
import { getExerciseProgress, listExerciseProgress } from './repository.js';
import { runWithCatalogLanguage } from '../../infrastructure/requestLanguage.js';

function fixture(system = true, owner = 'owner') {
  return [{ publicId: 'w1', clientId: 'c1', startedAt: new Date('2026-11-02T09:00:00Z'), completedAt: new Date('2026-11-02T10:00:00Z'),
    exercises: [{ publicId: 'occ1', order: 2,
      exercise: { publicId: 'e1', name: 'Historical name', nameEs: 'Press español', nameEn: 'English press',
        aliases: ['Bánca'], category: 'Chest', trackingType: 'weight_reps', isSystemDefined: system,
        createdByUser: { publicId: owner }, deletedAt: new Date() },
      sets: [{ publicId: 's1', order: 1, reps: 5, repsLeft: null, repsRight: null, weightKg: 100,
        durationSeconds: null, distanceMeters: null, completedAt: new Date(), type: 'normal', isWarmup: false }],
    }],
  }];
}
beforeEach(() => { vi.clearAllMocks(); });
describe('owned progress projection', () => {
  it('scopes the query by workout owner with stable exercise/set order, retaining retired history', async () => {
    vi.mocked(prisma.workoutSession.findMany).mockResolvedValue(fixture() as never);
    const result = await getExerciseProgress('owner', 'e1');
    const query = vi.mocked(prisma.workoutSession.findMany).mock.calls[0][0]!;
    expect(query).toMatchObject({ where: { user: { publicId: 'owner' } },
      include: { exercises: { orderBy: { order: 'asc' }, include: { sets: { orderBy: { order: 'asc' } } } } } });
    expect(query.where).not.toHaveProperty('deletedAt');
    expect(result?.points[0]).toMatchObject({ workoutId: 'w1', heaviestWorkingSet: { workoutExerciseId: 'occ1', setId: 's1', setOrder: 1 } });
    expect(result?.searchNames).toContain('Bánca');
  });
  it.each([true, false])('exposes bilingual search names for system/own exercises: system=%s', async (system) => {
    vi.mocked(prisma.workoutSession.findMany).mockResolvedValue(fixture(system) as never);
    const result = await new Promise<Awaited<ReturnType<typeof listExerciseProgress>>>((resolve, reject) => {
      runWithCatalogLanguage('en', () => { void listExerciseProgress('owner').then(resolve, reject); });
    });
    expect(result[0].exerciseName).toBe('English press');
    expect(result[0].searchNames).toEqual(['Historical name', 'Press español', 'English press', 'Bánca']);
  });
  it('allows an owned historical reference name without exposing foreign private aliases/translations', async () => {
    vi.mocked(prisma.workoutSession.findMany).mockResolvedValue(fixture(false, 'someone-else') as never);
    const [result] = await listExerciseProgress('owner');
    expect(result.exerciseName).toBe('Historical name');
    expect(result.searchNames).toEqual(['Historical name']);
    expect(JSON.stringify(result)).not.toContain('Bánca');
  });
  it('returns no detail for IDs absent from the owned history', async () => {
    vi.mocked(prisma.workoutSession.findMany).mockResolvedValue(fixture() as never);
    expect(await getExerciseProgress('owner', 'foreign')).toBeNull();
  });
  it('keeps database failure distinct from no performed history', async () => {
    vi.mocked(prisma.workoutSession.findMany).mockRejectedValue(new Error('database unavailable'));
    await expect(listExerciseProgress('owner')).rejects.toThrow('database unavailable');
  });
});
