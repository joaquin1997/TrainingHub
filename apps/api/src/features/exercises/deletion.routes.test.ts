/**
 * Spec 0033 — deleting a custom exercise, through the real routes and the
 * real repositories, against a small in-memory stand-in for the database.
 *
 * The stand-in evaluates the same Prisma `where` objects the repositories
 * build (catalog/own visibility, the creator-only impact counts, same-name
 * dedupe), so these tests check the rules end to end without a server:
 * creator only, "not found" for everyone else, counts of the creator's data
 * only, history still named after deletion, a fresh exercise for the same
 * name. A real Postgres pass is logged in the spec's tasks.md.
 */
import { Prisma } from '@prisma/client';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

type Row = Record<string, any>;

const db = vi.hoisted(() => {
  /** Whether `value` satisfies a Prisma-style condition (the subset the repositories use). */
  function matches(value: any, cond: any): boolean {
    if (cond === null) {
      return value === null || value === undefined;
    }
    if (typeof cond !== 'object' || cond instanceof Date) {
      return value === cond;
    }

    return Object.entries(cond).every(([key, sub]: [string, any]) => {
      switch (key) {
        case 'OR':
          return (sub as any[]).some((branch) => matches(value, branch));
        case 'equals':
          return cond.mode === 'insensitive' && typeof value === 'string'
            ? value.toLowerCase() === String(sub).toLowerCase()
            : value === sub;
        case 'mode':
          return true;
        case 'in':
          return (sub as any[]).includes(value);
        case 'some':
          return Array.isArray(value) && value.some((item) => matches(item, sub));
        default:
          return value !== null && value !== undefined && matches(value[key], sub);
      }
    });
  }

  const state = {
    exercises: [] as Row[],
    favorites: [] as Row[],
    photos: [] as Row[],
    routines: [] as Row[],
    workouts: [] as Row[],
    muscleGroups: [] as Row[],
    nextId: 100n,
    /** Test hooks for races and failures. */
    staleCountOnce: false,
    photoDeleteFailsOnce: false,
    makeForeignKeyError: (): Error => new Error('P2003'),
  };

  const routineSlots = (exerciseId: bigint) =>
    state.routines.flatMap((routine) =>
      routine.exercises
        .filter((slot: Row) => slot.exerciseId === exerciseId)
        .map(() => ({ routine })),
    );
  const workoutSlots = (exerciseId: bigint) =>
    state.workouts.flatMap((workout) =>
      workout.exercises
        .filter((slot: Row) => slot.exerciseId === exerciseId)
        .map(() => ({ workoutSession: workout })),
    );

  /** An exercise with its relations, as Prisma would join them. */
  const view = (exercise: Row) => {
    const photo = state.photos.find((row) => row.exerciseId === exercise.id);
    const routineExercises = routineSlots(exercise.id);
    const workoutExercises = workoutSlots(exercise.id);
    const stale = state.staleCountOnce;
    state.staleCountOnce = false;

    return {
      ...exercise,
      photo: photo ? { updatedAt: photo.updatedAt } : null,
      routineExercises,
      workoutExercises,
      _count: {
        routineExercises: stale ? 0 : routineExercises.length,
        workoutExercises: stale ? 0 : workoutExercises.length,
      },
    };
  };

  const sortExercises = (rows: Row[]) =>
    rows.sort(
      (left, right) =>
        Number(right.isSystemDefined) - Number(left.isSystemDefined) ||
        Number(left.id - right.id),
    );

  const prisma = {
    exercise: {
      findMany: async ({ where }: Row) =>
        state.exercises
          .map(view)
          .filter((row) => matches(row, where))
          .sort((left, right) => left.name.localeCompare(right.name)),
      findFirst: async ({ where }: Row) =>
        sortExercises(state.exercises.map(view).filter((row) => matches(row, where)))[0] ??
        null,
      findUnique: async ({ where }: Row) => {
        const exercise = state.exercises.find((row) => matches(row, where));
        return exercise ? view(exercise) : null;
      },
      create: async ({ data }: Row) => {
        const now = new Date();
        const exercise = {
          id: (state.nextId += 1n),
          publicId: `ex-new-${state.nextId}`,
          source: data.source,
          sourceId: data.sourceId,
          name: data.name,
          description: null,
          category: null,
          language: null,
          imageUrl: null,
          equipment: data.equipment,
          licenseAuthor: null,
          lastSourceUpdate: null,
          isSystemDefined: data.isSystemDefined,
          trackingType: data.trackingType,
          isUnilateral: data.isUnilateral,
          deletedAt: null,
          createdByUser: { publicId: data.createdByUser.connect.publicId },
          primaryMuscleGroupLinks: [],
          secondaryMuscleGroupLinks: [],
          createdAt: now,
          updatedAt: now,
        };
        state.exercises.push(exercise);
        return view(exercise);
      },
      update: async ({ where, data }: Row) => {
        const exercise = state.exercises.find((row) => matches(row, where));
        if (!exercise) throw new Error('update: no row');
        Object.assign(exercise, data);
        return view(exercise);
      },
      delete: async ({ where }: Row) => {
        const exercise = state.exercises.find((row) => matches(row, where));
        if (!exercise) throw new Error('delete: no row');
        // RoutineExercise and WorkoutExercise restrict; the rest cascades.
        if (routineSlots(exercise.id).length + workoutSlots(exercise.id).length > 0) {
          throw state.makeForeignKeyError();
        }
        state.exercises = state.exercises.filter((row) => row !== exercise);
        state.favorites = state.favorites.filter((row) => row.exerciseId !== exercise.id);
        state.photos = state.photos.filter((row) => row.exerciseId !== exercise.id);
        return exercise;
      },
    },
    exerciseFavorite: {
      findMany: async ({ where }: Row) =>
        state.favorites
          .map((row) => ({
            ...row,
            exercise: view(state.exercises.find((exercise) => exercise.id === row.exerciseId)!),
          }))
          .filter((row) => matches(row, where)),
      deleteMany: async ({ where }: Row) => {
        const before = state.favorites.length;
        state.favorites = state.favorites.filter((row) => !matches(row, where));
        return { count: before - state.favorites.length };
      },
    },
    exercisePhoto: {
      findFirst: async ({ where }: Row) =>
        state.photos
          .map((row) => ({
            ...row,
            exercise: view(state.exercises.find((exercise) => exercise.id === row.exerciseId)!),
          }))
          .find((row) => matches(row, where)) ?? null,
      deleteMany: async ({ where }: Row) => {
        if (state.photoDeleteFailsOnce) {
          state.photoDeleteFailsOnce = false;
          throw new Error('storage unavailable');
        }
        const before = state.photos.length;
        state.photos = state.photos.filter((row) => !matches(row, where));
        return { count: before - state.photos.length };
      },
    },
    user: {
      findUnique: async ({ where }: Row) =>
        [
          { id: 1n, publicId: 'user-ana' },
          { id: 2n, publicId: 'user-ben' },
        ].find((row) => matches(row, where)) ?? null,
    },
    muscleGroup: {
      findMany: async ({ where }: Row = {}) =>
        state.muscleGroups.filter((row) => matches(row, where ?? {})),
    },
    routine: {
      count: async ({ where }: Row) => state.routines.filter((row) => matches(row, where)).length,
      findFirst: async ({ where }: Row) => {
        const routine = state.routines.find((row) => matches(row, where));
        return routine
          ? {
              ...routine,
              exercises: routine.exercises.map((slot: Row) => ({
                ...slot,
                exercise: state.exercises.find((exercise) => exercise.id === slot.exerciseId),
              })),
            }
          : null;
      },
    },
    workoutSession: {
      count: async ({ where }: Row) => state.workouts.filter((row) => matches(row, where)).length,
      findMany: async ({ where }: Row) =>
        state.workouts.filter((row) => matches(row, where)).map(hydrateWorkout),
      findFirst: async ({ where }: Row) => {
        const workout = state.workouts.find((row) => matches(row, where));
        return workout ? hydrateWorkout(workout) : null;
      },
    },
    $transaction: async (operations: Array<Promise<unknown>>) => Promise.all(operations),
  };

  /** A workout as its include returns it: each exercise joined to its (live) exercise row. */
  function hydrateWorkout(workout: Row) {
    return {
      ...workout,
      exercises: workout.exercises.map((slot: Row) => ({
        ...slot,
        exercise: state.exercises.find((exercise) => exercise.id === slot.exerciseId),
      })),
    };
  }

  return { prisma, state, matches };
});

vi.mock('../../infrastructure/prisma.js', () => ({ prisma: db.prisma }));

// Mock persistence only: requests pass through real JWT verification and user resolution.
vi.mock('../../infrastructure/sessionUser.js', () => ({
  findSessionUser: vi.fn(async (publicId: string) => ({ publicId })),
}));

import { createApp } from '../../app.js';
import { findUsableExercises } from './repository.js';

const app = createApp({ logger: false });
beforeAll(async () => { await app.ready(); });
const { state } = db;

const ANA = 'user-ana';
const BEN = 'user-ben';
const T0 = new Date('2026-10-01T09:00:00.000Z');

function exercise(
  id: bigint,
  publicId: string,
  name: string,
  creator: string | null,
): Row {
  return {
    id,
    publicId,
    source: creator ? 'custom' : 'wger',
    sourceId: publicId,
    name,
    description: null,
    category: null,
    language: null,
    imageUrl: null,
    equipment: [],
    licenseAuthor: null,
    lastSourceUpdate: null,
    isSystemDefined: creator === null,
    trackingType: 'weight_reps',
    isUnilateral: false,
    deletedAt: null,
    createdByUser: creator ? { publicId: creator } : null,
    primaryMuscleGroupLinks: [],
    secondaryMuscleGroupLinks: [],
    createdAt: T0,
    updatedAt: T0,
  };
}

function workout(publicId: string, user: string, day: number, exerciseIds: bigint[]): Row {
  const startedAt = new Date(Date.UTC(2026, 9, day, 9));
  const completedAt = new Date(Date.UTC(2026, 9, day, 10));
  return {
    publicId,
    clientId: publicId,
    user: { publicId: user },
    routine: null,
    status: 'completed',
    startedAt,
    completedAt,
    pausedSeconds: 0,
    notes: null,
    warmUpItems: [],
    createdAt: completedAt,
    updatedAt: completedAt,
    exercises: exerciseIds.map((exerciseId, index) => ({
      publicId: `${publicId}-we${index}`,
      exerciseId,
      routineExercise: null,
      order: index + 1,
      notes: null,
      createdAt: completedAt,
      updatedAt: completedAt,
      sets: [1, 2].map((order) => ({
        publicId: `${publicId}-we${index}-s${order}`,
        order,
        type: 'normal',
        reps: 10,
        repsLeft: null,
        repsRight: null,
        weightKg: 50 + day,
        durationSeconds: null,
        distanceMeters: null,
        restSeconds: null,
        isWarmup: false,
        completedAt,
        createdAt: completedAt,
        updatedAt: completedAt,
      })),
    })),
  };
}

function routine(publicId: string, user: string, slots: Array<[bigint, string]>): Row {
  return {
    publicId,
    user: { publicId: user },
    name: publicId,
    description: null,
    folder: null,
    warmUpItems: [],
    createdAt: T0,
    updatedAt: T0,
    exercises: slots.map(([exerciseId, exerciseName], index) => ({
      publicId: `${publicId}-re${index}`,
      exerciseId,
      exerciseName,
      orderIndex: index + 1,
      restSeconds: 90,
      supersetGroup: null,
      createdAt: T0,
      updatedAt: T0,
      sets: [
        {
          publicId: `${publicId}-re${index}-s1`,
          setNumber: 1,
          minReps: 8,
          maxReps: 12,
          targetWeight: 40,
          targetDurationSeconds: null,
          targetDistanceMeters: null,
          isWarmup: false,
          isGeneratedWarmup: false,
          createdAt: T0,
          updatedAt: T0,
        },
      ],
    })),
  };
}

const TYPO = 1n;
const HAMMER = 2n;
const CATALOG = 3n;
const BEN_OWN = 4n;

beforeEach(() => {
  state.exercises = [
    // Ana's typo: never used, has a photo, favourited.
    exercise(TYPO, 'ex-typo', 'Press Landmie', ANA),
    // Ana's old gym machine: 1 routine and 3 workouts of hers. Ben held it
    // from before custom exercises were private (spec 0015).
    exercise(HAMMER, 'ex-hammer', 'Hammer row', ANA),
    exercise(CATALOG, 'ex-catalog', 'Sentadilla', null),
    exercise(BEN_OWN, 'ex-ben', 'Ben press', BEN),
  ];
  state.favorites = [
    { userId: 1n, user: { publicId: ANA }, exerciseId: TYPO },
    { userId: 1n, user: { publicId: ANA }, exerciseId: HAMMER },
    { userId: 2n, user: { publicId: BEN }, exerciseId: HAMMER },
  ];
  state.photos = [
    { exerciseId: TYPO, data: Buffer.from([0xff, 0xd8, 0xff]), updatedAt: T0 },
    { exerciseId: HAMMER, data: Buffer.from([0xff, 0xd8, 0xff]), updatedAt: T0 },
  ];
  state.routines = [
    routine('r-ana-back', ANA, [[HAMMER, 'Hammer row'], [CATALOG, 'Sentadilla']]),
    routine('r-ana-legs', ANA, [[CATALOG, 'Sentadilla']]),
    routine('r-ben-back', BEN, [[HAMMER, 'Hammer row']]),
  ];
  state.workouts = [
    workout('w-ana-1', ANA, 1, [HAMMER, CATALOG]),
    workout('w-ana-2', ANA, 3, [HAMMER]),
    workout('w-ana-3', ANA, 5, [HAMMER]),
    workout('w-ana-4', ANA, 7, [CATALOG]),
    workout('w-ben-1', BEN, 2, [HAMMER]),
    workout('w-ben-2', BEN, 4, [HAMMER]),
  ];
  state.muscleGroups = [{ id: 1n, name: 'back', createdAt: T0, updatedAt: T0 }];
  state.nextId = 100n;
  state.staleCountOnce = false;
  state.photoDeleteFailsOnce = false;
  state.makeForeignKeyError = () =>
    new Prisma.PrismaClientKnownRequestError('Foreign key constraint violated', {
      code: 'P2003',
      clientVersion: 'test',
    });
});

afterAll(async () => {
  await app.close();
});

const as = (user: string) => ({ authorization: `Bearer ${app.jwt.sign({ sub: user })}` });
const impact = (user: string | null, id: string) =>
  app.inject({
    method: 'GET',
    url: `/exercises/${id}/deletion-impact`,
    headers: user ? as(user) : {},
  });
const remove = (user: string | null, id: string, query = '') =>
  app.inject({
    method: 'DELETE',
    url: `/exercises/${id}${query}`,
    headers: user ? as(user) : {},
  });
const listIds = async (user: string) =>
  (await app.inject({ method: 'GET', url: '/exercises', headers: as(user) }))
    .json()
    .map((row: { id: string }) => row.id);
const row = (id: bigint) => state.exercises.find((exercise) => exercise.id === id);
const snapshot = (response: Awaited<ReturnType<typeof app.inject>>) => ({
  status: response.statusCode,
  contentType: response.headers['content-type'],
  body: response.body,
});

describe('who can delete (spec 0033 FR-1, FR-2, EF-3)', () => {
  it('requires a signed-in person', async () => {
    expect((await impact(null, 'ex-hammer')).statusCode).toBe(401);
    expect((await remove(null, 'ex-hammer')).statusCode).toBe(401);
    expect(row(HAMMER)?.deletedAt).toBeNull();
  });

  it("answers someone else exactly as for an exercise that does not exist, and changes nothing", async () => {
    for (const send of [impact, remove]) {
      const hidden = snapshot(await send(BEN, 'ex-hammer'));
      const unknown = snapshot(await send(BEN, 'ex-never-existed'));

      expect(hidden.status).toBe(404);
      expect(hidden).toEqual(unknown);
      expect(hidden.body).not.toContain('ex-hammer');
    }

    // Ben deleting Ana's never-used exercise does not remove it either.
    expect((await remove(BEN, 'ex-typo')).statusCode).toBe(404);
    expect(row(TYPO)).toBeDefined();
    expect(row(HAMMER)?.deletedAt).toBeNull();
    expect(await listIds(ANA)).toEqual(expect.arrayContaining(['ex-typo', 'ex-hammer']));
  });

  it('refuses catalog exercises for everyone (403), and changes nothing', async () => {
    for (const user of [ANA, BEN]) {
      expect((await impact(user, 'ex-catalog')).statusCode).toBe(403);
      const response = await remove(user, 'ex-catalog');
      expect(response.statusCode).toBe(403);
      expect(response.json()).toEqual({ message: 'Catalog exercises cannot be deleted' });
    }
    expect(row(CATALOG)).toBeDefined();
  });

  it('lets the creator delete their own exercise', async () => {
    expect((await remove(BEN, 'ex-ben')).statusCode).toBe(204);
    expect(row(BEN_OWN)).toBeUndefined();
  });
});

describe('impact (spec 0033 FR-3, AC-1, AC-2)', () => {
  it("counts only the creator's own routines and saved workouts", async () => {
    const response = await impact(ANA, 'ex-hammer');

    expect(response.statusCode).toBe(200);
    // Ben's routine and two workouts that hold it are not counted.
    expect(response.json()).toEqual({ routineCount: 1, workoutCount: 3 });
  });

  it('says a never-used exercise is used nowhere', async () => {
    expect((await impact(ANA, 'ex-typo')).json()).toEqual({ routineCount: 0, workoutCount: 0 });
  });

  it('changes nothing (cancelling is free)', async () => {
    await impact(ANA, 'ex-hammer');
    expect(row(HAMMER)?.deletedAt).toBeNull();
    expect(await listIds(ANA)).toContain('ex-hammer');
  });
});

describe('deleting a never-used exercise (AC-1)', () => {
  it('removes it entirely, with its photo and favourites', async () => {
    expect((await remove(ANA, 'ex-typo')).statusCode).toBe(204);

    expect(row(TYPO)).toBeUndefined();
    expect(state.photos.some((photo) => photo.exerciseId === TYPO)).toBe(false);
    expect(state.favorites.some((favorite) => favorite.exerciseId === TYPO)).toBe(false);
    expect(await listIds(ANA)).not.toContain('ex-typo');
  });

  it('keeps it (deleted) when the active workout on the device contains it (FR-8)', async () => {
    expect((await remove(ANA, 'ex-typo', '?inActiveWorkout=true')).statusCode).toBe(204);

    expect(row(TYPO)?.deletedAt).toBeInstanceOf(Date);
    expect(await listIds(ANA)).not.toContain('ex-typo');
  });

  it('keeps it when a save referenced it in the meantime (race)', async () => {
    state.routines.push({ publicId: 'r-new', user: { publicId: ANA }, exercises: [{ exerciseId: TYPO }] });
    state.staleCountOnce = true; // the look-up still saw it unused

    expect((await remove(ANA, 'ex-typo')).statusCode).toBe(204);
    expect(row(TYPO)?.deletedAt).toBeInstanceOf(Date);
  });
});

describe('deleting a used exercise (AC-2, AC-3, FR-5, FR-6, FR-9, FR-10)', () => {
  it('hides it from the catalog, detail, search, favourites and photo', async () => {
    expect((await remove(ANA, 'ex-hammer')).statusCode).toBe(204);

    expect(await listIds(ANA)).not.toContain('ex-hammer');
    const detail = await app.inject({ method: 'GET', url: '/exercises/ex-hammer', headers: as(ANA) });
    expect(detail.statusCode).toBe(404);

    const favourites = await app.inject({ method: 'GET', url: '/exercises/favorites', headers: as(ANA) });
    expect(favourites.json()).toEqual(['ex-typo']);
    // Removed for everyone, Ben's included (FR-10).
    expect(state.favorites.some((favorite) => favorite.exerciseId === HAMMER)).toBe(false);

    const photo = await app.inject({ method: 'GET', url: '/exercises/ex-hammer/photo', headers: as(ANA) });
    expect(photo.statusCode).toBe(404);
    expect(state.photos.some((stored) => stored.exerciseId === HAMMER)).toBe(false);
  });

  it('keeps every saved workout readable, under its name, with all its sets', async () => {
    await remove(ANA, 'ex-hammer');

    for (const id of ['w-ana-1', 'w-ana-2', 'w-ana-3']) {
      const response = await app.inject({ method: 'GET', url: `/workouts/${id}`, headers: as(ANA) });
      expect(response.statusCode).toBe(200);
      const hammer = response
        .json()
        .exercises.find((entry: { exerciseId: string }) => entry.exerciseId === 'ex-hammer');
      expect(hammer).toMatchObject({ exerciseName: 'Hammer row' });
      expect(hammer.sets).toHaveLength(2);
    }

    const history = await app.inject({ method: 'GET', url: '/workouts', headers: as(ANA) });
    expect(history.statusCode).toBe(200);
    expect(JSON.stringify(history.json())).toContain('Hammer row');
  });

  it('keeps its progress and records (AC-3)', async () => {
    await remove(ANA, 'ex-hammer');

    const progress = await app.inject({
      method: 'GET',
      url: '/progress/exercises/ex-hammer',
      headers: as(ANA),
    });
    expect(progress.statusCode).toBe(200);
    expect(progress.json()).toMatchObject({ exerciseName: 'Hammer row' });
    expect(progress.json().points).toHaveLength(3);
  });

  it("leaves someone who held it able to read it in their own history", async () => {
    await remove(ANA, 'ex-hammer');

    const response = await app.inject({ method: 'GET', url: '/workouts/w-ben-1', headers: as(BEN) });
    expect(response.json().exercises[0]).toMatchObject({ exerciseName: 'Hammer row' });
  });

  it('never rewrites routines or workouts (Article 2)', async () => {
    const dump = () =>
      JSON.stringify([state.routines, state.workouts], (_key, value) =>
        typeof value === 'bigint' ? value.toString() : value,
      );
    const before = dump();
    await remove(ANA, 'ex-hammer');
    expect(dump()).toBe(before);
  });

  it('succeeds even when the photo cannot be removed, and never serves it again (EF-4)', async () => {
    state.photoDeleteFailsOnce = true;

    expect((await remove(ANA, 'ex-hammer')).statusCode).toBe(204);
    expect(row(HAMMER)?.deletedAt).toBeInstanceOf(Date);
    expect(state.photos.some((stored) => stored.exerciseId === HAMMER)).toBe(true);
    const photo = await app.inject({ method: 'GET', url: '/exercises/ex-hammer/photo', headers: as(ANA) });
    expect(photo.statusCode).toBe(404);
  });

  it('treats a second deletion as done (EF-2), and has no impact any more', async () => {
    expect((await remove(ANA, 'ex-hammer')).statusCode).toBe(204);
    const deletedAt = row(HAMMER)?.deletedAt;

    expect((await remove(ANA, 'ex-hammer')).statusCode).toBe(204);
    expect(row(HAMMER)?.deletedAt).toBe(deletedAt);
    expect((await impact(ANA, 'ex-hammer')).statusCode).toBe(404);
    // Still "not found" for Ben, never "deleted".
    expect(snapshot(await remove(BEN, 'ex-hammer'))).toEqual(
      snapshot(await remove(BEN, 'ex-never-existed')),
    );
  });

  it('refuses writes to a deleted exercise like an unknown one', async () => {
    await remove(ANA, 'ex-hammer');

    const unilateral = await app.inject({
      method: 'PUT',
      url: '/exercises/ex-hammer/unilateral',
      headers: as(ANA),
      payload: { isUnilateral: true },
    });
    expect(unilateral.statusCode).toBe(404);
    const favourite = await app.inject({
      method: 'PUT',
      url: '/exercises/ex-hammer/favorite',
      headers: as(ANA),
    });
    expect(favourite.statusCode).toBe(404);
  });
});

describe('routines that contain a deleted exercise (FR-7, AC-4)', () => {
  it('keep it with its targets, rest and name, marked as deleted', async () => {
    const before = await app.inject({ method: 'GET', url: '/routines/r-ana-back', headers: as(ANA) });
    expect(before.json().exercises[0]).not.toHaveProperty('exerciseDeleted');

    await remove(ANA, 'ex-hammer');

    const response = await app.inject({ method: 'GET', url: '/routines/r-ana-back', headers: as(ANA) });
    expect(response.statusCode).toBe(200);
    const [hammer, squat] = response.json().exercises;
    expect(hammer).toMatchObject({
      exerciseId: 'ex-hammer',
      exerciseName: 'Hammer row',
      exerciseDeleted: true,
      restSeconds: 90,
      sets: [expect.objectContaining({ minReps: 8, maxReps: 12, targetWeight: 40 })],
    });
    expect(squat).not.toHaveProperty('exerciseDeleted');
  });

  it("stay saveable: the creator's deleted exercise is still usable for her saves (FR-7, FR-8, EF-5)", async () => {
    await remove(ANA, 'ex-hammer');
    await remove(ANA, 'ex-typo', '?inActiveWorkout=true'); // kept only for the active workout

    const usable = await findUsableExercises(ANA, ['ex-hammer', 'ex-typo']);
    expect([...usable.keys()].sort()).toEqual(['ex-hammer', 'ex-typo']);
    expect(usable.get('ex-hammer')).toEqual({ id: 'ex-hammer', name: 'Hammer row' });
  });

  it('stay saveable for someone who held it, and give nobody else a way in', async () => {
    await remove(ANA, 'ex-hammer');
    await remove(ANA, 'ex-typo', '?inActiveWorkout=true');

    // Ben held Ana's exercise in his routine and workouts (spec 0015).
    expect([...(await findUsableExercises(BEN, ['ex-hammer', 'ex-typo'])).keys()]).toEqual([
      'ex-hammer',
    ]);
  });
});

describe('same name after deletion (FR-11, AC-8)', () => {
  it('creates a new, empty exercise and leaves the history with the deleted one', async () => {
    await remove(ANA, 'ex-hammer');

    const created = await app.inject({
      method: 'POST',
      url: '/exercises',
      headers: as(ANA),
      payload: { name: 'hammer ROW', primaryMuscleGroupIds: ['1'], secondaryMuscleGroupIds: [] },
    });

    expect(created.statusCode).toBe(201);
    const fresh = created.json();
    expect(fresh.id).not.toBe('ex-hammer');
    expect(await listIds(ANA)).toContain(fresh.id);
    expect(row(HAMMER)?.deletedAt).toBeInstanceOf(Date);

    const progress = await app.inject({
      method: 'GET',
      url: `/progress/exercises/${fresh.id}`,
      headers: as(ANA),
    });
    expect(progress.statusCode).toBe(404); // no history of its own

    const old = await app.inject({ method: 'GET', url: '/workouts/w-ana-2', headers: as(ANA) });
    expect(old.json().exercises[0]).toMatchObject({ exerciseId: 'ex-hammer', exerciseName: 'Hammer row' });
  });

  it('still returns the live exercise of the same name before deletion (spec 0015 dedupe)', async () => {
    const created = await app.inject({
      method: 'POST',
      url: '/exercises',
      headers: as(ANA),
      payload: { name: 'Hammer Row', primaryMuscleGroupIds: ['1'], secondaryMuscleGroupIds: [] },
    });
    expect(created.json().id).toBe('ex-hammer');
  });
});

describe('the in-memory stand-in', () => {
  it('evaluates the conditions the repositories use', () => {
    expect(db.matches({ a: null }, { a: null })).toBe(true);
    expect(db.matches({ a: { b: 'x' } }, { a: { b: 'y' } })).toBe(false);
    expect(db.matches({ name: 'Hammer Row' }, { name: { equals: 'hammer row', mode: 'insensitive' } })).toBe(true);
    expect(db.matches({ list: [{ id: 1 }] }, { list: { some: { id: 1 } } })).toBe(true);
    expect(db.matches({ x: 1 }, { OR: [{ x: 2 }, { x: 1 }] })).toBe(true);
    expect(db.matches({ createdByUser: null }, { createdByUser: { publicId: 'a' } })).toBe(false);
  });
});
