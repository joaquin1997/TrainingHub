import { PrismaClient } from '@prisma/client';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { exerciseWarmUpPreferences } from './warmUpPreferencesRepository.js';

// Explicit opt-in: never use the application's DATABASE_URL for destructive setup.
const url = process.env.TRAININGHUB_TEST_DATABASE_URL;
const db = url ? new PrismaClient({ datasources: { db: { url } } }) : null;
const prefix = `warmup-${Date.now()}`;
const alice = `${prefix}-alice`, bob = `${prefix}-bob`;
const shared = `${prefix}-shared`, own = `${prefix}-own`;
const defaults = { loadingKind: null, approachSetCount: null, incrementKg: null };
describe.skipIf(!db)('warm-up preferences in an isolated migrated database', () => {
  beforeAll(async () => {
    const a = await db!.user.create({ data: { publicId: alice, displayName: 'Alice' } });
    await db!.user.create({ data: { publicId: bob, displayName: 'Bob' } });
    await db!.exercise.create({ data: { publicId: shared, source: prefix, sourceId: shared, name: 'Cable curl', loadingKind: 'machine', equipment: ['cable'] } });
    await db!.exercise.create({ data: { publicId: own, source: prefix, sourceId: own, name: 'Private', isSystemDefined: false, createdByUserId: a.id, equipment: [] } });
  });
  afterAll(async () => {
    await db!.exercise.deleteMany({ where: { source: prefix } });
    await db!.user.deleteMany({ where: { publicId: { in: [alice, bob] } } });
    await db!.$disconnect();
  });
  it('isolates two users on the same exercise, survives reset and never rewrites catalog', async () => {
    const a = { loadingKind: 'dumbbell' as const, approachSetCount: 5 as const, incrementKg: 2.5 };
    expect(await exerciseWarmUpPreferences(alice, shared, undefined, db!)).toEqual(defaults);
    expect(await exerciseWarmUpPreferences(alice, shared, a, db!)).toEqual(a);
    expect(await exerciseWarmUpPreferences(bob, shared, undefined, db!)).toEqual(defaults);
    expect(await exerciseWarmUpPreferences(alice, shared, undefined, db!)).toEqual(a);
    await exerciseWarmUpPreferences(alice, shared, defaults, db!);
    expect(await exerciseWarmUpPreferences(alice, shared, undefined, db!)).toEqual(defaults);
    expect((await db!.exercise.findUniqueOrThrow({ where: { publicId: shared } })).loadingKind).toBe('machine');
  });
  it('hides foreign custom exercises and refuses deleted/retired exercises without creating preferences', async () => {
    expect(await exerciseWarmUpPreferences(bob, own, defaults, db!)).toBeNull();
    expect(await exerciseWarmUpPreferences(alice, own, defaults, db!)).toEqual(defaults);
    await db!.exercise.update({ where: { publicId: own }, data: { deletedAt: new Date() } });
    expect(await exerciseWarmUpPreferences(alice, own, defaults, db!)).toBeNull();
    await db!.exercise.update({ where: { publicId: shared }, data: { deletedAt: new Date() } });
    expect(await exerciseWarmUpPreferences(bob, shared, defaults, db!)).toBeNull();
    expect(await exerciseWarmUpPreferences(alice, 'missing', defaults, db!)).toBeNull();
  });
});
