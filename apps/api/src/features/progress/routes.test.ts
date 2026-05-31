import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./repository.js', () => ({
  listExerciseProgress: vi.fn(),
  getExerciseProgress: vi.fn(),
  listWeeklyVolume: vi.fn(),
  listMuscleGroupVolume: vi.fn(),
}));

import { createApp } from '../../app.js';
import {
  getExerciseProgress,
  listExerciseProgress,
  listMuscleGroupVolume,
  listWeeklyVolume,
} from './repository.js';

const app = createApp({ logger: false });

beforeEach(() => {
  vi.clearAllMocks();
});

afterAll(async () => {
  await app.close();
});

describe('GET /progress/exercises', () => {
  it('returns the summaries from the repository', async () => {
    vi.mocked(listExerciseProgress).mockResolvedValue([
      { exerciseId: 'e1', exerciseName: 'Bench Press', sessionCount: 2 },
    ] as never);

    const response = await app.inject({ method: 'GET', url: '/progress/exercises' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject([{ exerciseId: 'e1', sessionCount: 2 }]);
  });
});

describe('GET /progress/weekly-volume', () => {
  it('returns the weekly volume points from the repository', async () => {
    vi.mocked(listWeeklyVolume).mockResolvedValue([
      { weekStart: '2026-05-04', totalVolume: 900, workoutCount: 2 },
    ] as never);

    const response = await app.inject({
      method: 'GET',
      url: '/progress/weekly-volume',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual([
      { weekStart: '2026-05-04', totalVolume: 900, workoutCount: 2 },
    ]);
  });
});

describe('GET /progress/muscle-distribution', () => {
  it('returns the muscle-group volume from the repository', async () => {
    vi.mocked(listMuscleGroupVolume).mockResolvedValue([
      { group: 'Chest', totalVolume: 1000 },
    ] as never);

    const response = await app.inject({
      method: 'GET',
      url: '/progress/muscle-distribution',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual([{ group: 'Chest', totalVolume: 1000 }]);
  });
});

describe('GET /progress/exercises/:exerciseId', () => {
  it('returns 404 when the exercise has no progress', async () => {
    vi.mocked(getExerciseProgress).mockResolvedValue(null as never);

    const response = await app.inject({
      method: 'GET',
      url: '/progress/exercises/missing',
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({ message: 'Exercise progress not found' });
  });

  it('returns the detail when progress exists', async () => {
    vi.mocked(getExerciseProgress).mockResolvedValue({
      exerciseId: 'e1',
      exerciseName: 'Bench Press',
      sessionCount: 1,
      points: [{ date: '2026-05-30T09:00:00.000Z', totalVolume: 480 }],
    } as never);

    const response = await app.inject({
      method: 'GET',
      url: '/progress/exercises/e1',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ exerciseId: 'e1', points: [{ totalVolume: 480 }] });
    expect(getExerciseProgress).toHaveBeenCalledWith('e1');
  });
});
