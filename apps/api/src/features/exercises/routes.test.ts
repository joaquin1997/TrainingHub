import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./repository.js', () => {
  class InvalidMuscleGroupSelectionError extends Error {}

  return {
    listExercises: vi.fn(),
    listMuscleGroups: vi.fn(),
    findExerciseById: vi.fn(),
    createExercise: vi.fn(),
    saveExercisePhoto: vi.fn(),
    deleteExercisePhoto: vi.fn(),
    findExercisePhoto: vi.fn(),
    listFavoriteExerciseIds: vi.fn(),
    addFavoriteExercise: vi.fn(),
    removeFavoriteExercise: vi.fn(),
    setExerciseUnilateral: vi.fn(),
    InvalidMuscleGroupSelectionError,
  };
});

vi.mock('../../infrastructure/userContext.js', () => ({
  resolveUserPublicId: vi.fn(async () => 'user-test'),
}));

import { createApp } from '../../app.js';
import { currentCatalogLanguage } from '../../infrastructure/requestLanguage.js';
import { resolveUserPublicId } from '../../infrastructure/userContext.js';
import { classifyExerciseAccess } from './visibility.js';
import {
  addFavoriteExercise,
  createExercise,
  deleteExercisePhoto,
  findExerciseById,
  findExercisePhoto,
  InvalidMuscleGroupSelectionError,
  listExercises,
  listFavoriteExerciseIds,
  listMuscleGroups,
  saveExercisePhoto,
  setExerciseUnilateral,
} from './repository.js';

const app = createApp({ logger: false });

const validPayload = {
  name: 'Bench Press',
  primaryMuscleGroupIds: ['1'],
  secondaryMuscleGroupIds: [],
};

beforeEach(() => {
  vi.clearAllMocks();
});

afterAll(async () => {
  await app.close();
});

describe('GET /exercises', () => {
  it('runs in the language the app asks for (spec 0044 FR-2)', async () => {
    const seen: string[] = [];
    vi.mocked(listExercises).mockImplementation(async () => {
      seen.push(currentCatalogLanguage());
      return [];
    });

    await app.inject({ method: 'GET', url: '/exercises', headers: { 'accept-language': 'en-GB' } });
    await app.inject({ method: 'GET', url: '/exercises' });

    expect(seen).toEqual(['en', 'es']);
  });

  it('returns the list from the repository', async () => {
    vi.mocked(listExercises).mockResolvedValue([{ id: 'e1' }] as never);

    const response = await app.inject({ method: 'GET', url: '/exercises' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual([{ id: 'e1' }]);
    // Scoped to the acting person (spec 0015 FR-1, AC-9 via the dev fallback).
    expect(listExercises).toHaveBeenCalledWith('user-test');
  });
});

describe('GET /muscle-groups', () => {
  it('returns the muscle groups from the repository', async () => {
    vi.mocked(listMuscleGroups).mockResolvedValue([{ id: '1', name: 'chest' }] as never);

    const response = await app.inject({ method: 'GET', url: '/muscle-groups' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual([{ id: '1', name: 'chest' }]);
  });
});

describe('GET /exercises/:id', () => {
  it('returns 404 when the exercise does not exist', async () => {
    vi.mocked(findExerciseById).mockResolvedValue(null as never);

    const response = await app.inject({ method: 'GET', url: '/exercises/missing' });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({ message: 'Exercise not found' });
  });

  it('returns the exercise when it exists', async () => {
    vi.mocked(findExerciseById).mockResolvedValue({ id: 'e1' } as never);

    const response = await app.inject({ method: 'GET', url: '/exercises/e1' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ id: 'e1' });
    expect(findExerciseById).toHaveBeenCalledWith('user-test', 'e1');
  });
});

describe('POST /exercises', () => {
  it('returns 400 when the payload is invalid', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/exercises',
      payload: { name: '', primaryMuscleGroupIds: [], secondaryMuscleGroupIds: [] },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({ message: 'Invalid exercise payload' });
    expect(createExercise).not.toHaveBeenCalled();
  });

  it('creates the exercise (201)', async () => {
    vi.mocked(createExercise).mockResolvedValue({ id: 'e1', name: 'Bench Press' } as never);

    const response = await app.inject({
      method: 'POST',
      url: '/exercises',
      payload: validPayload,
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toMatchObject({ id: 'e1' });
    expect(createExercise).toHaveBeenCalledWith(
      'user-test',
      expect.objectContaining({ name: 'Bench Press', primaryMuscleGroupIds: ['1'] }),
    );
  });

  it('passes the tracking type through (spec 0021 FR-2)', async () => {
    vi.mocked(createExercise).mockResolvedValue({ id: 'e2', name: 'Plank' } as never);

    const response = await app.inject({
      method: 'POST',
      url: '/exercises',
      payload: { ...validPayload, name: 'Plank', trackingType: 'duration' },
    });

    expect(response.statusCode).toBe(201);
    expect(createExercise).toHaveBeenCalledWith(
      'user-test',
      expect.objectContaining({ name: 'Plank', trackingType: 'duration' }),
    );
  });

  it('returns 400 on an unknown tracking type', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/exercises',
      payload: { ...validPayload, trackingType: 'pace' },
    });

    expect(response.statusCode).toBe(400);
    expect(createExercise).not.toHaveBeenCalled();
  });

  it('passes the unilateral flag through (spec 0022 FR-1)', async () => {
    vi.mocked(createExercise).mockResolvedValue({ id: 'e3', name: 'Split squat' } as never);

    const response = await app.inject({
      method: 'POST',
      url: '/exercises',
      payload: { ...validPayload, name: 'Split squat', isUnilateral: true },
    });

    expect(response.statusCode).toBe(201);
    expect(createExercise).toHaveBeenCalledWith(
      'user-test',
      expect.objectContaining({ name: 'Split squat', isUnilateral: true }),
    );
  });

  it('returns 400 when the unilateral flag is not a boolean', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/exercises',
      payload: { ...validPayload, isUnilateral: 'yes' },
    });

    expect(response.statusCode).toBe(400);
    expect(createExercise).not.toHaveBeenCalled();
  });

  it('returns 400 on invalid muscle group selection', async () => {
    vi.mocked(createExercise).mockRejectedValue(
      new InvalidMuscleGroupSelectionError('Invalid muscle group selection'),
    );

    const response = await app.inject({
      method: 'POST',
      url: '/exercises',
      payload: validPayload,
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({ message: 'Invalid muscle group selection' });
  });
});

describe('exercise photo', () => {
  const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0]);
  const token = () => `Bearer ${app.jwt.sign({ sub: 'user-test' })}`;
  const put = (imageBase64: string, withAuth = true) =>
    app.inject({
      method: 'PUT',
      url: '/exercises/e1/photo',
      headers: withAuth ? { authorization: token() } : {},
      payload: { imageBase64 },
    });

  it('requires a signed-in user', async () => {
    expect((await put(jpeg.toString('base64'), false)).statusCode).toBe(401);
    expect(saveExercisePhoto).not.toHaveBeenCalled();

    const read = await app.inject({ method: 'GET', url: '/exercises/e1/photo' });
    expect(read.statusCode).toBe(401);
  });

  it('rejects data that is not a JPEG', async () => {
    expect((await put(Buffer.from('<html></html>').toString('base64'))).statusCode).toBe(400);
    expect(saveExercisePhoto).not.toHaveBeenCalled();
  });

  it('saves the photo for the creator (204)', async () => {
    vi.mocked(saveExercisePhoto).mockResolvedValue('ok');
    const response = await put(jpeg.toString('base64'));
    expect(response.statusCode).toBe(204);
    expect(saveExercisePhoto).toHaveBeenCalledWith('user-test', 'e1', jpeg);
  });

  it('refuses catalog exercises (403) and unknown or hidden ones (404)', async () => {
    vi.mocked(saveExercisePhoto).mockResolvedValueOnce('forbidden');
    expect((await put(jpeg.toString('base64'))).statusCode).toBe(403);
    vi.mocked(saveExercisePhoto).mockResolvedValueOnce('not-found');
    expect((await put(jpeg.toString('base64'))).statusCode).toBe(404);
  });

  it('serves the stored photo with private caching', async () => {
    vi.mocked(findExercisePhoto).mockResolvedValue({ data: jpeg, updatedAt: new Date(0) });
    const response = await app.inject({
      method: 'GET',
      url: '/exercises/e1/photo',
      headers: { authorization: token() },
    });
    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toBe('image/jpeg');
    expect(String(response.headers['cache-control'])).toContain('private');
    expect(findExercisePhoto).toHaveBeenCalledWith('user-test', 'e1');
  });

  it('deletes through the repository (204)', async () => {
    vi.mocked(deleteExercisePhoto).mockResolvedValue('ok');
    const response = await app.inject({
      method: 'DELETE',
      url: '/exercises/e1/photo',
      headers: { authorization: token() },
    });
    expect(response.statusCode).toBe(204);
  });
});

describe('PUT /exercises/:id/unilateral (spec 0022)', () => {
  const token = () => `Bearer ${app.jwt.sign({ sub: 'user-test' })}`;
  const put = (payload: unknown, withAuth = true) =>
    app.inject({
      method: 'PUT',
      url: '/exercises/e1/unilateral',
      headers: withAuth ? { authorization: token() } : {},
      payload: payload as Record<string, unknown>,
    });

  it('requires a signed-in user', async () => {
    expect((await put({ isUnilateral: true }, false)).statusCode).toBe(401);
    expect(setExerciseUnilateral).not.toHaveBeenCalled();
  });

  it('rejects a body without a boolean flag', async () => {
    expect((await put({ isUnilateral: 'true' })).statusCode).toBe(400);
    expect((await put({})).statusCode).toBe(400);
    expect(setExerciseUnilateral).not.toHaveBeenCalled();
  });

  it('marks the exercise and returns it', async () => {
    vi.mocked(setExerciseUnilateral).mockResolvedValue({
      id: 'e1',
      name: 'Bulgarian split squat',
      isUnilateral: true,
    } as never);

    const response = await put({ isUnilateral: true });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ id: 'e1', isUnilateral: true });
    expect(setExerciseUnilateral).toHaveBeenCalledWith('user-test', 'e1', true);
  });

  it('answers 404 for unknown and hidden exercises (spec 0015 FR-14)', async () => {
    vi.mocked(setExerciseUnilateral).mockResolvedValueOnce('not-found');
    const response = await put({ isUnilateral: false });
    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({ message: 'Exercise not found' });
  });
});

/**
 * Spec 0015 FR-2 / AC-2: someone else's custom exercise answers exactly like
 * one that never existed. The repository mock behaves like the real one: it
 * applies the same visibility rule (`classifyExerciseAccess`) to a small
 * in-memory catalog. So these tests check that every route passes the acting
 * person and maps "hidden" and "unknown" to one identical answer.
 */
describe('no existence leak for custom exercises (spec 0015)', () => {
  const world: Record<
    string,
    { isSystemDefined: boolean; creatorPublicId: string | null; hasPhoto: boolean }
  > = {
    'ex-ana': { isSystemDefined: false, creatorPublicId: 'user-ana', hasPhoto: true },
    'ex-catalog': { isSystemDefined: true, creatorPublicId: null, hasPhoto: false },
  };
  const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0]);

  const access = (user: string, id: string) => {
    const exercise = world[id];
    return exercise ? classifyExerciseAccess(exercise, user) : 'missing';
  };
  const visible = (user: string, id: string) => {
    const result = access(user, id);
    return result === 'catalog' || result === 'own';
  };
  const asExercise = (id: string) => ({
    id,
    name: id,
    isSystemDefined: world[id]?.isSystemDefined,
  });
  const photoWrite = (user: string, id: string) => {
    const result = access(user, id);
    return result === 'own' ? 'ok' : result === 'catalog' ? 'forbidden' : 'not-found';
  };

  beforeEach(() => {
    vi.mocked(resolveUserPublicId).mockImplementation(
      async (request) => request.user?.sub ?? 'user-dev',
    );
    vi.mocked(findExerciseById).mockImplementation(
      async (user, id) => (visible(user, id) ? asExercise(id) : null) as never,
    );
    vi.mocked(findExercisePhoto).mockImplementation(async (user, id) =>
      visible(user, id) && world[id]?.hasPhoto
        ? { data: jpeg, updatedAt: new Date(0) }
        : null,
    );
    vi.mocked(addFavoriteExercise).mockImplementation(async (user, id) => visible(user, id));
    vi.mocked(setExerciseUnilateral).mockImplementation(
      async (user, id) =>
        (visible(user, id) ? { ...asExercise(id), isUnilateral: true } : 'not-found') as never,
    );
    vi.mocked(saveExercisePhoto).mockImplementation(async (user, id) => photoWrite(user, id));
    vi.mocked(deleteExercisePhoto).mockImplementation(async (user, id) => photoWrite(user, id));
  });

  afterAll(() => {
    vi.mocked(resolveUserPublicId).mockImplementation(async () => 'user-test');
  });

  const as = (user: string) => ({
    authorization: `Bearer ${app.jwt.sign({ sub: user })}`,
  });

  const requests: Array<{
    name: string;
    send: (user: string, id: string) => ReturnType<typeof app.inject>;
  }> = [
    {
      name: 'detail',
      send: (user, id) =>
        app.inject({ method: 'GET', url: `/exercises/${id}`, headers: as(user) }),
    },
    {
      name: 'photo read',
      send: (user, id) =>
        app.inject({ method: 'GET', url: `/exercises/${id}/photo`, headers: as(user) }),
    },
    {
      name: 'photo write',
      send: (user, id) =>
        app.inject({
          method: 'PUT',
          url: `/exercises/${id}/photo`,
          headers: as(user),
          payload: { imageBase64: jpeg.toString('base64') },
        }),
    },
    {
      name: 'photo delete',
      send: (user, id) =>
        app.inject({ method: 'DELETE', url: `/exercises/${id}/photo`, headers: as(user) }),
    },
    {
      name: 'favourite',
      send: (user, id) =>
        app.inject({ method: 'PUT', url: `/exercises/${id}/favorite`, headers: as(user) }),
    },
    {
      name: 'unilateral',
      send: (user, id) =>
        app.inject({
          method: 'PUT',
          url: `/exercises/${id}/unilateral`,
          headers: as(user),
          payload: { isUnilateral: true },
        }),
    },
  ];

  const snapshot = (response: Awaited<ReturnType<typeof app.inject>>) => ({
    status: response.statusCode,
    contentType: response.headers['content-type'],
    body: response.body,
  });

  for (const request of requests) {
    it(`${request.name}: Ben gets for Ana's exercise exactly what he gets for an unknown id`, async () => {
      const hidden = snapshot(await request.send('user-ben', 'ex-ana'));
      const unknown = snapshot(await request.send('user-ben', 'ex-never-existed'));

      expect(hidden.status).toBe(404);
      expect(hidden).toEqual(unknown);
      expect(hidden.body).not.toContain('user-ana');
      expect(hidden.body).not.toContain('ex-ana');
    });

    it(`${request.name}: Ana, the creator, is served`, async () => {
      const own = await request.send('user-ana', 'ex-ana');
      expect(own.statusCode).toBeLessThan(300);
    });
  }

  it('never answers 403 for a hidden exercise, on any route', async () => {
    for (const request of requests) {
      const response = await request.send('user-ben', 'ex-ana');
      expect(response.statusCode, request.name).not.toBe(403);
    }
  });

  it('passes the acting person, not a fixed one, to the repository', async () => {
    await app.inject({ method: 'GET', url: '/exercises/ex-ana', headers: as('user-ben') });
    expect(findExerciseById).toHaveBeenLastCalledWith('user-ben', 'ex-ana');

    vi.mocked(listExercises).mockResolvedValue([] as never);
    await app.inject({ method: 'GET', url: '/exercises', headers: as('user-ben') });
    expect(listExercises).toHaveBeenLastCalledWith('user-ben');

    vi.mocked(listFavoriteExerciseIds).mockResolvedValue([]);
    await app.inject({ method: 'GET', url: '/exercises/favorites', headers: as('user-ben') });
    expect(listFavoriteExerciseIds).toHaveBeenLastCalledWith('user-ben');
  });

  it('a request without a token acts as the fallback account (AC-9)', async () => {
    vi.mocked(listExercises).mockResolvedValue([] as never);
    await app.inject({ method: 'GET', url: '/exercises' });
    expect(listExercises).toHaveBeenLastCalledWith('user-dev');

    const detail = await app.inject({ method: 'GET', url: '/exercises/ex-ana' });
    expect(detail.statusCode).toBe(404);
  });

  it('catalog exercises stay visible to everyone', async () => {
    const detail = await app.inject({
      method: 'GET',
      url: '/exercises/ex-catalog',
      headers: as('user-ben'),
    });
    expect(detail.statusCode).toBe(200);

    const favourite = await app.inject({
      method: 'PUT',
      url: '/exercises/ex-catalog/favorite',
      headers: as('user-ben'),
    });
    expect(favourite.statusCode).toBe(204);
  });
});

