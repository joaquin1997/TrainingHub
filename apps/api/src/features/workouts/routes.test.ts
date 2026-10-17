import { Prisma } from '@prisma/client';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./repository.js', () => ({
  listWorkoutSessions: vi.fn(),
  findWorkoutSessionById: vi.fn(),
  createWorkoutSession: vi.fn(),
  getExerciseLastPerformance: vi.fn(),
}));

vi.mock('../../infrastructure/userContext.js', () => ({
  resolveUserPublicId: vi.fn(async () => 'user-test'),
}));

import { createApp } from '../../app.js';
import { UnknownExerciseError } from './saveReferences.js';
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

  it('returns 400 when startedAt is not a readable date', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/workouts',
      payload: { ...validPayload, startedAt: 'yesterday-ish' },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({ message: 'Workout times must be valid dates' });
    expect(createWorkoutSession).not.toHaveBeenCalled();
  });

  it('returns 400 when a set completion time is not a readable date', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/workouts',
      payload: {
        ...validPayload,
        exercises: [
          {
            exerciseId: 'ex1',
            order: 1,
            sets: [{ order: 1, reps: 8, weightKg: 60, completedAt: 'not-a-date' }],
          },
        ],
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({ message: 'Workout times must be valid dates' });
    expect(createWorkoutSession).not.toHaveBeenCalled();
  });

  it('returns 400 when the workout ends before it starts', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/workouts',
      payload: { ...validPayload, completedAt: '2026-05-30T08:00:00.000Z' },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({ message: 'A workout cannot end before it starts' });
    expect(createWorkoutSession).not.toHaveBeenCalled();
  });

  it('passes a valid pausedSeconds through', async () => {
    vi.mocked(createWorkoutSession).mockResolvedValue({
      session: { id: 'w1' },
      created: true,
    } as never);

    const response = await app.inject({
      method: 'POST',
      url: '/workouts',
      payload: { ...validPayload, pausedSeconds: 600 },
    });

    expect(response.statusCode).toBe(201);
    expect(createWorkoutSession).toHaveBeenCalledWith(
      'user-test',
      expect.objectContaining({ pausedSeconds: 600 }),
    );
  });

  it('accepts a save without pausedSeconds (older apps)', async () => {
    vi.mocked(createWorkoutSession).mockResolvedValue({
      session: { id: 'w1' },
      created: true,
    } as never);

    const response = await app.inject({ method: 'POST', url: '/workouts', payload: validPayload });

    expect(response.statusCode).toBe(201);
    expect(createWorkoutSession).toHaveBeenCalledWith(
      'user-test',
      expect.objectContaining({ pausedSeconds: undefined }),
    );
  });

  it.each([-1, 1.5, '60'])('returns 400 when pausedSeconds is %s', async (pausedSeconds) => {
    const response = await app.inject({
      method: 'POST',
      url: '/workouts',
      payload: { ...validPayload, pausedSeconds },
    });

    expect(response.statusCode).toBe(400);
    expect(createWorkoutSession).not.toHaveBeenCalled();
  });

  it('returns 400 when the workout was paused longer than it lasted', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/workouts',
      // validPayload lasts 30 minutes.
      payload: { ...validPayload, pausedSeconds: 30 * 60 + 1 },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({
      message: "Paused time cannot exceed the workout's duration",
    });
    expect(createWorkoutSession).not.toHaveBeenCalled();
  });

  it('returns 400 when clientId is too long', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/workouts',
      payload: { ...validPayload, clientId: 'x'.repeat(65) },
    });

    expect(response.statusCode).toBe(400);
    expect(createWorkoutSession).not.toHaveBeenCalled();
  });

  it('passes the clientId through to the repository', async () => {
    vi.mocked(createWorkoutSession).mockResolvedValue({
      session: { id: 'w1' },
      created: true,
    } as never);

    await app.inject({
      method: 'POST',
      url: '/workouts',
      payload: { ...validPayload, clientId: ' lzx1-abc ' },
    });

    expect(createWorkoutSession).toHaveBeenCalledWith(
      'user-test',
      expect.objectContaining({ clientId: 'lzx1-abc' }),
    );
  });

  it('creates the session (201) and passes the parsed input', async () => {
    vi.mocked(createWorkoutSession).mockResolvedValue({
      session: { id: 'w1' },
      created: true,
    } as never);

    const response = await app.inject({
      method: 'POST',
      url: '/workouts',
      payload: validPayload,
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toMatchObject({ id: 'w1' });
    expect(createWorkoutSession).toHaveBeenCalledWith(
      'user-test',
      expect.objectContaining({
        routineId: 'r1',
        startedAt: validPayload.startedAt,
        exercises: [
          expect.objectContaining({ exerciseId: 'ex1', order: 1 }),
        ],
      }),
    );
  });

  it('stores left and right with reps as their sum (spec 0022 AC-1, EF-1)', async () => {
    vi.mocked(createWorkoutSession).mockResolvedValue({
      session: { id: 'w1' },
      created: true,
    } as never);
    const completedAt = '2026-05-30T09:10:00.000Z';

    const response = await app.inject({
      method: 'POST',
      url: '/workouts',
      payload: {
        ...validPayload,
        exercises: [
          {
            exerciseId: 'ex1',
            order: 1,
            sets: [
              { order: 1, reps: 3, repsLeft: 10, repsRight: 8, weightKg: 20, completedAt },
              { order: 2, repsLeft: 9, repsRight: 0, weightKg: 20, completedAt },
            ],
          },
        ],
      },
    });

    expect(response.statusCode).toBe(201);
    const input = vi.mocked(createWorkoutSession).mock.calls[0]![1];
    expect(input.exercises[0]!.sets[0]).toMatchObject({
      reps: 18,
      repsLeft: 10,
      repsRight: 8,
      weightKg: 20,
    });
    expect(input.exercises[0]!.sets[1]).toMatchObject({ reps: 9, repsLeft: 9 });
    expect(input.exercises[0]!.sets[1]!.repsRight).toBeUndefined();
  });

  it('answers 200 with the stored workout when the clientId was already saved', async () => {
    vi.mocked(createWorkoutSession).mockResolvedValue({
      session: { id: 'w-first' },
      created: false,
    } as never);

    const response = await app.inject({
      method: 'POST',
      url: '/workouts',
      payload: { ...validPayload, clientId: 'c1' },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ id: 'w-first' });
  });

  it('returns 400 when an exercise does not exist', async () => {
    vi.mocked(createWorkoutSession).mockRejectedValue(
      new UnknownExerciseError('ex-gone'),
    );

    const response = await app.inject({
      method: 'POST',
      url: '/workouts',
      payload: validPayload,
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({
      message: 'Workout references an unknown exercise',
    });
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
    expect(getExerciseLastPerformance).toHaveBeenCalledWith('user-test', 'ex1');
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

describe('POST /workouts warm-up block (spec 0024)', () => {
  const warmUpItems = [
    { name: 'Bike', targetDurationSeconds: 300, done: true },
    { name: 'Band pull-aparts', targetReps: 15, done: false },
  ];

  it('passes every item with whether it was done (FR-7)', async () => {
    vi.mocked(createWorkoutSession).mockResolvedValue({
      session: { id: 'w1' },
      created: true,
    } as never);

    const response = await app.inject({
      method: 'POST',
      url: '/workouts',
      payload: { ...validPayload, warmUpItems },
    });

    expect(response.statusCode).toBe(201);
    expect(vi.mocked(createWorkoutSession).mock.calls[0]?.[1].warmUpItems).toEqual([
      { name: 'Bike', targetDurationSeconds: 300, targetReps: undefined, done: true },
      { name: 'Band pull-aparts', targetDurationSeconds: undefined, targetReps: 15, done: false },
    ]);
  });

  it('does not count ticked items as completed sets (FR-6)', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/workouts',
      payload: {
        ...validPayload,
        warmUpItems,
        exercises: [{ exerciseId: 'ex1', order: 1, sets: [{ order: 1, reps: 8 }] }],
      },
    });

    expect(response.statusCode).toBe(400);
    expect(createWorkoutSession).not.toHaveBeenCalled();
  });

  it('refuses a malformed block (400)', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/workouts',
      payload: { ...validPayload, warmUpItems: [{ done: true }] },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({ message: 'Invalid workout payload' });
  });
});
