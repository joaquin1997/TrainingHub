import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./repository.js', () => {
  class InvalidMuscleGroupSelectionError extends Error {}

  return {
    listExercises: vi.fn(),
    listMuscleGroups: vi.fn(),
    findExerciseById: vi.fn(),
    createExercise: vi.fn(),
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
  findExerciseById,
  InvalidMuscleGroupSelectionError,
  listExercises,
  listMuscleGroups,
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
