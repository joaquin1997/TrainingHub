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
    InvalidMuscleGroupSelectionError,
  };
});

vi.mock('../../infrastructure/userContext.js', () => ({
  resolveUserPublicId: vi.fn(async () => 'user-test'),
}));

import { createApp } from '../../app.js';
import {
  createExercise,
  deleteExercisePhoto,
  findExerciseById,
  findExercisePhoto,
  InvalidMuscleGroupSelectionError,
  listExercises,
  listMuscleGroups,
  saveExercisePhoto,
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
  it('returns the list from the repository', async () => {
    vi.mocked(listExercises).mockResolvedValue([{ id: 'e1' }] as never);

    const response = await app.inject({ method: 'GET', url: '/exercises' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual([{ id: 'e1' }]);
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
  const put = (headers: Record<string, string>, payload: Buffer | string = jpeg) =>
    app.inject({ method: 'PUT', url: '/exercises/e1/photo', headers, payload });

  function authHeaders(contentType = 'image/jpeg') {
    return {
      authorization: `Bearer ${app.jwt.sign({ sub: 'user-test' })}`,
      'content-type': contentType,
    };
  }

  it('requires a signed-in user', async () => {
    const response = await put({ 'content-type': 'image/jpeg' });
    expect(response.statusCode).toBe(401);
    expect(saveExercisePhoto).not.toHaveBeenCalled();

    const read = await app.inject({ method: 'GET', url: '/exercises/e1/photo' });
    expect(read.statusCode).toBe(401);
  });

  it('rejects unsupported types and bytes that are not the claimed image', async () => {
    expect((await put(authHeaders('image/gif'), 'GIF89a')).statusCode).toBe(415);
    expect((await put(authHeaders(), '<html></html>')).statusCode).toBe(400);
    expect(saveExercisePhoto).not.toHaveBeenCalled();
  });

  it('saves the photo for the creator (204)', async () => {
    vi.mocked(saveExercisePhoto).mockResolvedValue('ok');
    const response = await put(authHeaders());
    expect(response.statusCode).toBe(204);
    expect(saveExercisePhoto).toHaveBeenCalledWith('user-test', 'e1', 'image/jpeg', jpeg);
  });

  it('refuses anyone but the creator (403) and unknown exercises (404)', async () => {
    vi.mocked(saveExercisePhoto).mockResolvedValueOnce('forbidden');
    expect((await put(authHeaders())).statusCode).toBe(403);
    vi.mocked(saveExercisePhoto).mockResolvedValueOnce('not-found');
    expect((await put(authHeaders())).statusCode).toBe(404);
  });

  it('serves the stored photo with private caching', async () => {
    vi.mocked(findExercisePhoto).mockResolvedValue({
      contentType: 'image/jpeg',
      data: jpeg,
      updatedAt: new Date(0),
    });
    const response = await app.inject({
      method: 'GET',
      url: '/exercises/e1/photo',
      headers: { authorization: authHeaders().authorization },
    });
    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toBe('image/jpeg');
    expect(String(response.headers['cache-control'])).toContain('private');
  });

  it('deletes through the repository (204)', async () => {
    vi.mocked(deleteExercisePhoto).mockResolvedValue('ok');
    const response = await app.inject({
      method: 'DELETE',
      url: '/exercises/e1/photo',
      headers: { authorization: authHeaders().authorization },
    });
    expect(response.statusCode).toBe(204);
  });
});
