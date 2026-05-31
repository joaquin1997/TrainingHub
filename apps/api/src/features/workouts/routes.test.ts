import { Prisma } from '@prisma/client';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./repository.js', () => ({
  listWorkoutSessions: vi.fn(),
  findWorkoutSessionById: vi.fn(),
  createWorkoutSession: vi.fn(),
  getExerciseLastPerformance: vi.fn(),
}));

import { createApp } from '../../app.js';
import {
  createWorkoutSession,
  findWorkoutSessionById,
  getExerciseLastPerformance,
  listWorkoutSessions,
} from './repository.js';

const app = createApp({ logger: false });

const validPayload = {
  routineId: 'r1',
  startedAt: '2026-05-30T09:00:00.000Z',
  completedAt: '2026-05-30T09:30:00.000Z',
  exercises: [
    {
      exerciseId: 'ex1',
      order: 1,
      sets: [
        {
          order: 1,
          reps: 8,
          weightKg: 60,
          completedAt: '2026-05-30T09:10:00.000Z',
        },
      ],
    },
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
});

afterAll(async () => {
  await app.close();
});

describe('GET /workouts', () => {
  it('returns the list from the repository', async () => {
    vi.mocked(listWorkoutSessions).mockResolvedValue([{ id: 'w1' }] as never);

    const response = await app.inject({ method: 'GET', url: '/workouts' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual([{ id: 'w1' }]);
  });
});

describe('GET /workouts/:id', () => {
  it('returns 404 when the session does not exist', async () => {
    vi.mocked(findWorkoutSessionById).mockResolvedValue(null as never);

    const response = await app.inject({ method: 'GET', url: '/workouts/missing' });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({ message: 'Workout session not found' });
  });

  it('returns the session when it exists', async () => {
    vi.mocked(findWorkoutSessionById).mockResolvedValue({ id: 'w1' } as never);

    const response = await app.inject({ method: 'GET', url: '/workouts/w1' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ id: 'w1' });
  });
});

describe('POST /workouts', () => {
  it('returns 400 when startedAt is missing', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/workouts',
      payload: { exercises: validPayload.exercises },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({ message: 'Invalid workout payload' });
    expect(createWorkoutSession).not.toHaveBeenCalled();
  });

  it('returns 400 when there are no exercises', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/workouts',
      payload: { startedAt: validPayload.startedAt, exercises: [] },
    });

    expect(response.statusCode).toBe(400);
    expect(createWorkoutSession).not.toHaveBeenCalled();
  });

  it('returns 400 when no set is completed', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/workouts',
      payload: {
        ...validPayload,
        exercises: [
          {
            exerciseId: 'ex1',
            order: 1,
            sets: [{ order: 1, reps: 8, weightKg: 60 }],
          },
        ],
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({
      message: 'A workout must have at least one completed set',
    });
    expect(createWorkoutSession).not.toHaveBeenCalled();
  });

  it('creates the session (201) and passes the parsed input', async () => {
    vi.mocked(createWorkoutSession).mockResolvedValue({ id: 'w1' } as never);

    const response = await app.inject({
      method: 'POST',
      url: '/workouts',
      payload: validPayload,
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toMatchObject({ id: 'w1' });
    expect(createWorkoutSession).toHaveBeenCalledWith(
      expect.objectContaining({
        routineId: 'r1',
        startedAt: validPayload.startedAt,
        exercises: [
          expect.objectContaining({ exerciseId: 'ex1', order: 1 }),
        ],
      }),
    );
  });

  it('returns 400 when an exercise/routine reference is unknown (Prisma P2025)', async () => {
    vi.mocked(createWorkoutSession).mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('not found', {
        code: 'P2025',
        clientVersion: 'test',
      }),
    );

    const response = await app.inject({
      method: 'POST',
      url: '/workouts',
      payload: validPayload,
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({
      message: 'Workout references unknown exercise or routine',
    });
  });
});

describe('GET /workouts/exercises/:exerciseId/last', () => {
  it('returns the last performance when present', async () => {
    vi.mocked(getExerciseLastPerformance).mockResolvedValue({
      performedAt: '2026-05-20T09:00:00.000Z',
      sets: [{ order: 1, reps: 8, weightKg: 60 }],
    } as never);

    const response = await app.inject({
      method: 'GET',
      url: '/workouts/exercises/ex1/last',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ sets: [{ order: 1, weightKg: 60 }] });
    expect(getExerciseLastPerformance).toHaveBeenCalledWith('ex1');
  });

  it('returns 404 when there is no previous performance', async () => {
    vi.mocked(getExerciseLastPerformance).mockResolvedValue(null as never);

    const response = await app.inject({
      method: 'GET',
      url: '/workouts/exercises/ex1/last',
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({ message: 'No previous performance' });
  });
});
