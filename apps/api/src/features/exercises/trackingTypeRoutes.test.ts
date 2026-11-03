import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./trackingTypeRepository.js', () => ({
  setExerciseTrackingType: vi.fn(),
}));

// Mock persistence only: requests pass through real JWT verification and user resolution.
vi.mock('../../infrastructure/sessionUser.js', () => ({
  findSessionUser: vi.fn(async (publicId: string) => ({ publicId })),
}));

import { createApp } from '../../app.js';
import { setExerciseTrackingType } from './trackingTypeRepository.js';

const app = createApp({ logger: false });
beforeAll(async () => { await app.ready(); });

beforeEach(() => {
  vi.clearAllMocks();
});

afterAll(async () => {
  await app.close();
});

describe('PUT /exercises/:id/tracking-type (spec 0030)', () => {
  const token = () => `Bearer ${app.jwt.sign({ sub: 'user-test' })}`;
  const put = (payload: unknown, withAuth = true) =>
    app.inject({
      method: 'PUT',
      url: '/exercises/e1/tracking-type',
      headers: withAuth ? { authorization: token() } : {},
      payload: payload as Record<string, unknown>,
    });

  it('requires a signed-in user', async () => {
    expect((await put({ trackingType: 'duration' }, false)).statusCode).toBe(401);
    expect(setExerciseTrackingType).not.toHaveBeenCalled();
  });

  it('rejects a type that is not one of the five', async () => {
    expect((await put({ trackingType: 'weight_distance' })).statusCode).toBe(400);
    expect((await put({})).statusCode).toBe(400);
    expect(setExerciseTrackingType).not.toHaveBeenCalled();
  });

  it('changes the type and returns the exercise (FR-12)', async () => {
    vi.mocked(setExerciseTrackingType).mockResolvedValue({
      id: 'e1',
      name: 'Mountain climbers',
      trackingType: 'duration',
    } as never);

    const response = await put({ trackingType: 'duration' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ id: 'e1', trackingType: 'duration' });
    expect(setExerciseTrackingType).toHaveBeenCalledWith('user-test', 'e1', 'duration');
  });

  it("answers 404 for someone else's custom exercise (0015) and unknown ones", async () => {
    vi.mocked(setExerciseTrackingType).mockResolvedValueOnce('not-found');
    expect((await put({ trackingType: 'reps' })).statusCode).toBe(404);
  });
});
