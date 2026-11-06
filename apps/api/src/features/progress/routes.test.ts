import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./repository.js', () => ({
  listExerciseProgress: vi.fn(),
  getExerciseProgress: vi.fn(),
  listWeeklyVolume: vi.fn(),
  listMuscleGroupVolume: vi.fn(),
  listSessionRecords: vi.fn(),
  listStartingRecords: vi.fn(),
  listComparisonReferences: vi.fn(),
}));

// Mock persistence only: requests pass through real JWT verification and user resolution.
vi.mock('../../infrastructure/sessionUser.js', () => ({
  findSessionUser: vi.fn(async (publicId: string) => ({ publicId })),
}));

import { createApp } from '../../app.js';
import {
  getExerciseProgress,
  listComparisonReferences,
  listExerciseProgress,
  listMuscleGroupVolume,
  listSessionRecords,
  listStartingRecords,
  listWeeklyVolume,
} from './repository.js';

const app = createApp({ logger: false });
const sessionHeaders = () => ({ authorization: `Bearer ${app.jwt.sign({ sub: 'user-test' })}` });
beforeAll(async () => { await app.ready(); });

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

    const response = await app.inject({ headers: sessionHeaders(), method: 'GET', url: '/progress/exercises' });

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
      headers: sessionHeaders(),
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
      headers: sessionHeaders(),
      method: 'GET',
      url: '/progress/muscle-distribution',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual([{ group: 'Chest', totalVolume: 1000 }]);
  });
});

describe('GET /progress/starting-records (spec 0032)', () => {
  it('passes the distinct ids, in order, to the repository', async () => {
    vi.mocked(listStartingRecords).mockResolvedValue([
      { exerciseId: 'e2', bests: {}, repsAtWeight: [] },
      { exerciseId: 'e1', bests: { heaviestWeight: 100 }, repsAtWeight: [] },
    ]);

    const response = await app.inject({
      headers: sessionHeaders(),
      method: 'GET',
      url: '/progress/starting-records?exerciseIds=e2,e1,e2',
    });

    expect(response.statusCode).toBe(200);
    expect(listStartingRecords).toHaveBeenCalledWith('user-test', ['e2', 'e1']);
    expect(response.json()).toHaveLength(2);
  });

  it.each(['', '?exerciseIds=', '?exerciseIds=,,'])('refuses %j with 400', async (query) => {
    const response = await app.inject({
      headers: sessionHeaders(),
      method: 'GET',
      url: `/progress/starting-records${query}`,
    });

    expect(response.statusCode).toBe(400);
    expect(listStartingRecords).not.toHaveBeenCalled();
  });

  it('refuses more than 50 ids', async () => {
    const ids = Array.from({ length: 51 }, (_, index) => `e${index}`).join(',');
    const response = await app.inject({
      headers: sessionHeaders(),
      method: 'GET',
      url: `/progress/starting-records?exerciseIds=${ids}`,
    });

    expect(response.statusCode).toBe(400);
  });
});

describe('GET /progress/exercises/:exerciseId', () => {
  it('returns 404 when the exercise has no progress', async () => {
    vi.mocked(getExerciseProgress).mockResolvedValue(null as never);

    const response = await app.inject({
      headers: sessionHeaders(),
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
      headers: sessionHeaders(),
      method: 'GET',
      url: '/progress/exercises/e1',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ exerciseId: 'e1', points: [{ totalVolume: 480 }] });
    expect(getExerciseProgress).toHaveBeenCalledWith('user-test', 'e1');
  });
});

describe('GET /progress/session-records', () => {
  it('returns the records each workout beat for the signed-in user', async () => {
    const records = [
      {
        workoutId: 'w2',
        clientId: 'c2',
        records: [
          {
            type: 'bestSessionVolume',
            value: 1500,
            date: '2026-05-08T09:00:00.000Z',
            exerciseId: 'bench',
            exerciseName: 'Bench Press',
          },
        ],
      },
    ];
    vi.mocked(listSessionRecords).mockResolvedValue(records as never);

    const response = await app.inject({ headers: sessionHeaders(), method: 'GET', url: '/progress/session-records' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual(records);
    expect(listSessionRecords).toHaveBeenCalledWith('user-test');
  });
});

describe('readable progress transport (0042)', () => {
  it.each(['/progress/exercises', '/progress/exercises/foreign'])('requires identity for %s', async (url) => {
    const response = await app.inject({ method: 'GET', url });
    expect(response.statusCode).toBe(401);
    expect(listExerciseProgress).not.toHaveBeenCalled();
    expect(getExerciseProgress).not.toHaveBeenCalled();
  });
  it('passes additive evidence and bilingual names through without inventing values', async () => {
    const detail = { exerciseId: 'e1', exerciseName: 'Bench', searchNames: ['Bánca', 'Bench'],
      sessionCount: 1, isRecordSession: false, readableProgressVersion: 1,
      points: [{ date: '2026-11-02T10:00:00Z', workoutId: 'w1', totalVolume: 500,
        sessionVolumeKg: 500, heaviestWorkingSet: { setId: 's1', weightKg: 100, reps: 5 } }],
    };
    vi.mocked(getExerciseProgress).mockResolvedValue(detail as never);
    const response = await app.inject({ method: 'GET', url: '/progress/exercises/e1', headers: sessionHeaders() });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual(detail);
  });
  it('keeps service failure distinct from a successful empty/404 result', async () => {
    vi.mocked(getExerciseProgress).mockRejectedValue(new Error('Unavailable'));
    const response = await app.inject({ method: 'GET', url: '/progress/exercises/e1', headers: sessionHeaders() });
    expect(response.statusCode).toBe(500);
  });
});

describe('GET comparison references (0048)', () => {
  const url = '/progress/comparison-references?exerciseIds=e,e&before=2026-11-04T10:00:00Z';
  it('passes validated identity, distinct IDs and boundary to the repository', async () => {
    vi.mocked(listComparisonReferences).mockResolvedValue([]);
    const response = await app.inject({ method: 'GET', url, headers: sessionHeaders() });
    expect(response.statusCode).toBe(200);
    expect(listComparisonReferences).toHaveBeenCalledWith('user-test', ['e'], '2026-11-04T10:00:00.000Z');
  });
  it('rejects anonymous access', async () => {
    expect((await app.inject({ method: 'GET', url })).statusCode).toBe(401);
    expect(listComparisonReferences).not.toHaveBeenCalled();
  });
  it.each(['', '?exerciseIds=e', '?exerciseIds=e&before=bad', '?exerciseIds=e&before=2026-11-04', '?exerciseIds=e&before=2026-02-30T10:00:00Z', '?exerciseIds=e&before=2026-11-04T24:00:00Z'])('rejects invalid query %s', async (query) => {
    expect((await app.inject({ method: 'GET', url: '/progress/comparison-references' + query, headers: sessionHeaders() })).statusCode).toBe(400);
  });
  it('preserves service failure as an error rather than empty history', async () => {
    vi.mocked(listComparisonReferences).mockRejectedValue(new Error('unavailable'));
    expect((await app.inject({ method: 'GET', url, headers: sessionHeaders() })).statusCode).toBe(500);
  });
});
