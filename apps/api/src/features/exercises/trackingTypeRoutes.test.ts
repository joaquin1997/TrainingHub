import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./trackingTypeRepository.js', () => ({
  setExerciseTrackingType: vi.fn(),
}));

vi.mock('../../infrastructure/userContext.js', () => ({
  resolveUserPublicId: vi.fn(async () => 'user-test'),
}));

import { createApp } from '../../app.js';
import { setExerciseTrackingType } from './trackingTypeRepository.js';

const app = createApp({ logger: false });

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

  it("refuses someone else's custom exercise (403, EF-6) and unknown ones (404)", async () => {
    vi.mocked(setExerciseTrackingType).mockResolvedValueOnce('forbidden');
    expect((await put({ trackingType: 'reps' })).statusCode).toBe(403);
    vi.mocked(setExerciseTrackingType).mockResolvedValueOnce('not-found');
    expect((await put({ trackingType: 'reps' })).statusCode).toBe(404);
  });
});
