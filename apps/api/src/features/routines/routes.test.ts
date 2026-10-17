import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

// The route module talks to the database through these repositories. We mock
// them so the tests exercise routing, validation and status codes only — no DB.
vi.mock('./repository.js', () => ({
  listRoutines: vi.fn(),
  findRoutineById: vi.fn(),
  createRoutine: vi.fn(),
  updateRoutine: vi.fn(),
  deleteRoutine: vi.fn(),
}));
vi.mock('../exercises/repository.js', () => ({
  findExerciseById: vi.fn(),
}));
vi.mock('../../infrastructure/userContext.js', () => ({
  resolveUserPublicId: vi.fn(async () => 'user-test'),
}));

import { createApp } from '../../app.js';
import { findExerciseById } from '../exercises/repository.js';
import {
  createRoutine,
  deleteRoutine,
  findRoutineById,
  listRoutines,
  updateRoutine,
} from './repository.js';

const app = createApp({ logger: false });

beforeEach(() => {
  vi.clearAllMocks();
});

afterAll(async () => {
  await app.close();
});

describe('GET /routines', () => {
  it('returns the list from the repository', async () => {
    vi.mocked(listRoutines).mockResolvedValue([{ id: 'r1', name: 'Push Day' }] as never);

    const response = await app.inject({ method: 'GET', url: '/routines' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual([{ id: 'r1', name: 'Push Day' }]);
    expect(listRoutines).toHaveBeenCalledTimes(1);
  });
});

describe('GET /routines/:id', () => {
  it('returns 404 when the routine does not exist', async () => {
    vi.mocked(findRoutineById).mockResolvedValue(null as never);

    const response = await app.inject({ method: 'GET', url: '/routines/missing' });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({ message: 'Routine not found' });
  });

  it('returns the routine when it exists', async () => {
    vi.mocked(findRoutineById).mockResolvedValue({ id: 'r1', name: 'Push Day' } as never);

    const response = await app.inject({ method: 'GET', url: '/routines/r1' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ id: 'r1' });
    expect(findRoutineById).toHaveBeenCalledWith('user-test', 'r1');
  });
});

describe('POST /routines', () => {
  it('returns 400 when the payload is invalid (missing name)', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/routines',
      payload: { description: 'no name' },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({ message: 'Invalid routine payload' });
    expect(createRoutine).not.toHaveBeenCalled();
  });

  it('returns 400 when an exercise reference is unknown', async () => {
    vi.mocked(findExerciseById).mockResolvedValue(null as never);

    const response = await app.inject({
      method: 'POST',
      url: '/routines',
      payload: {
        name: 'Push Day',
        exercises: [{ exerciseId: 'nope', orderIndex: 0, sets: [] }],
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({ message: 'Routine references unknown exercises' });
    expect(createRoutine).not.toHaveBeenCalled();
  });

  it('creates the routine and hydrates the exercise name (201)', async () => {
    vi.mocked(findExerciseById).mockResolvedValue({ id: 'ex1', name: 'Bench Press' } as never);
    vi.mocked(createRoutine).mockResolvedValue({ id: 'r1', name: 'Push Day' } as never);

    const response = await app.inject({
      method: 'POST',
      url: '/routines',
      payload: {
        name: 'Push Day',
        exercises: [
          { exerciseId: 'ex1', orderIndex: 0, sets: [{ setNumber: 1, minReps: 8, maxReps: 12 }] },
        ],
      },
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toMatchObject({ id: 'r1' });
    expect(createRoutine).toHaveBeenCalledTimes(1);
    expect(createRoutine).toHaveBeenCalledWith(
      'user-test',
      expect.objectContaining({
        name: 'Push Day',
        exercises: [expect.objectContaining({ exerciseId: 'ex1', exerciseName: 'Bench Press' })],
      }),
    );
  });
});

describe('POST /routines time and distance targets (spec 0021)', () => {
  it('passes time and distance targets to the repository', async () => {
    vi.mocked(findExerciseById).mockResolvedValue({ id: 'ex2', name: 'Plank' } as never);
    vi.mocked(createRoutine).mockResolvedValue({ id: 'r2', name: 'Core' } as never);

    const response = await app.inject({
      method: 'POST',
      url: '/routines',
      payload: {
        name: 'Core',
        exercises: [
          {
            exerciseId: 'ex2',
            orderIndex: 0,
            sets: [
              { setNumber: 1, targetDurationSeconds: 45 },
              { setNumber: 2, targetDistanceMeters: 500, targetDurationSeconds: 1.5 },
            ],
          },
        ],
      },
    });

    expect(response.statusCode).toBe(201);
    const input = vi.mocked(createRoutine).mock.calls[0]?.[1];
    expect(input?.exercises[0]?.sets).toEqual([
      expect.objectContaining({ setNumber: 1, targetDurationSeconds: 45 }),
      // Time is whole seconds: a fractional value is dropped, not rounded.
      expect.objectContaining({
        setNumber: 2,
        targetDistanceMeters: 500,
        targetDurationSeconds: undefined,
      }),
    ]);
  });
});

describe('POST /routines warm-up sets (spec 0024)', () => {
  it('passes isWarmup only for warm-up sets', async () => {
    vi.mocked(findExerciseById).mockResolvedValue({ id: 'ex1', name: 'Squat' } as never);
    vi.mocked(createRoutine).mockResolvedValue({ id: 'r3', name: 'Legs' } as never);

    const response = await app.inject({
      method: 'POST',
      url: '/routines',
      payload: {
        name: 'Legs',
        exercises: [
          {
            exerciseId: 'ex1',
            orderIndex: 1,
            sets: [
              { setNumber: 1, targetWeight: 20, minReps: 10, maxReps: 10, isWarmup: true },
              { setNumber: 2, targetWeight: 140, maxReps: 5, isWarmup: 'yes' },
              { setNumber: 3, targetWeight: 140, maxReps: 5 },
            ],
          },
        ],
      },
    });

    expect(response.statusCode).toBe(201);
    const sets = vi.mocked(createRoutine).mock.calls[0]?.[1].exercises[0]?.sets;
    expect(sets?.map((set) => set.isWarmup)).toEqual([true, undefined, undefined]);
  });
});

describe('routine warm-up block (spec 0024)', () => {
  const exercises = [{ exerciseId: 'ex1', orderIndex: 1, sets: [{ setNumber: 1 }] }];

  beforeEach(() => {
    vi.mocked(findExerciseById).mockResolvedValue({ id: 'ex1', name: 'Squat' } as never);
    vi.mocked(createRoutine).mockResolvedValue({ id: 'r4', name: 'Legs' } as never);
    vi.mocked(updateRoutine).mockResolvedValue({ id: 'r4', name: 'Legs' } as never);
  });

  it('passes the block, in order, trimmed, to the repository', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/routines',
      payload: {
        name: 'Legs',
        warmUpItems: [
          { name: ' Bike ', targetDurationSeconds: 300 },
          { name: 'Band pull-aparts', targetReps: 15 },
        ],
        exercises,
      },
    });

    expect(response.statusCode).toBe(201);
    expect(vi.mocked(createRoutine).mock.calls[0]?.[1].warmUpItems).toEqual([
      { name: 'Bike', targetDurationSeconds: 300, targetReps: undefined },
      { name: 'Band pull-aparts', targetDurationSeconds: undefined, targetReps: 15 },
    ]);
  });

  it('leaves the block out of an update that does not send it (older apps)', async () => {
    const response = await app.inject({
      method: 'PUT',
      url: '/routines/r4',
      payload: { name: 'Legs', exercises },
    });

    expect(response.statusCode).toBe(200);
    expect(vi.mocked(updateRoutine).mock.calls[0]?.[2].warmUpItems).toBeUndefined();
  });

  it('passes an empty block, which clears it', async () => {
    await app.inject({
      method: 'PUT',
      url: '/routines/r4',
      payload: { name: 'Legs', warmUpItems: [], exercises },
    });

    expect(vi.mocked(updateRoutine).mock.calls[0]?.[2].warmUpItems).toEqual([]);
  });

  it.each([
    ['not a list', { name: 'Bike' }],
    ['an item without a name', [{ name: '  ' }]],
    ['a negative target', [{ name: 'Bike', targetDurationSeconds: -1 }]],
    ['a fractional target', [{ name: 'Bike', targetReps: 1.5 }]],
    ['a name that is too long', [{ name: 'x'.repeat(81) }]],
    ['too many items', Array.from({ length: 21 }, (_, index) => ({ name: `Item ${index}` }))],
  ])('refuses %s (400)', async (_label, warmUpItems) => {
    const response = await app.inject({
      method: 'POST',
      url: '/routines',
      payload: { name: 'Legs', warmUpItems, exercises },
    });

    expect(response.statusCode).toBe(400);
    expect(createRoutine).not.toHaveBeenCalled();
  });
});

describe('DELETE /routines/:id', () => {
  it('returns 204 when the routine was deleted', async () => {
    vi.mocked(deleteRoutine).mockResolvedValue(true as never);

    const response = await app.inject({ method: 'DELETE', url: '/routines/r1' });

    expect(response.statusCode).toBe(204);
    expect(deleteRoutine).toHaveBeenCalledWith('user-test', 'r1');
  });

  it('returns 404 when the routine did not exist', async () => {
    vi.mocked(deleteRoutine).mockResolvedValue(false as never);

    const response = await app.inject({ method: 'DELETE', url: '/routines/missing' });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({ message: 'Routine not found' });
  });
});
