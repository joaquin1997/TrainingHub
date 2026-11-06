import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('./correctionsRepository.js', async (original) => {
  const actual = await original<typeof import('./correctionsRepository.js')>();
  return { ...actual, correctWorkoutSession: vi.fn() };
});
vi.mock('../../infrastructure/sessionUser.js', () => ({ findSessionUser: vi.fn(async (publicId: string) => ({ publicId })) }));
import { createApp } from '../../app.js';
import { correctWorkoutSession, WorkoutCorrectionError } from './correctionsRepository.js';
const app = createApp({ logger: false });
const payload = { expectedRevision: 0, mutationId: 'm', notes: null, exercises: [] };
beforeAll(() => app.ready()); afterAll(() => app.close()); beforeEach(() => vi.clearAllMocks());
const headers = () => ({ authorization: `Bearer ${app.jwt.sign({ sub: 'owner' })}` });
describe('PUT workout correction', () => {
  it('requires a validated session', async () => expect((await app.inject({ method: 'PUT', url: '/workouts/w/correction', payload })).statusCode).toBe(401));
  it('passes owned identity and the dedicated correction contract', async () => {
    vi.mocked(correctWorkoutSession).mockResolvedValue({ id: 'w', revision: 1 } as never);
    const response = await app.inject({ method: 'PUT', url: '/workouts/w/correction', payload, headers: headers() });
    expect(response.statusCode).toBe(200); expect(correctWorkoutSession).toHaveBeenCalledWith('owner', 'w', payload);
  });
  it('rejects structural fields before calling persistence', async () => {
    expect((await app.inject({ method: 'PUT', url: '/workouts/w/correction', payload: { ...payload, startedAt: 'changed' }, headers: headers() })).statusCode).toBe(400);
    expect(correctWorkoutSession).not.toHaveBeenCalled();
  });
  it('does not expose database errors containing submitted private values', async () => {
    vi.mocked(correctWorkoutSession).mockRejectedValue(new Error('synthetic private note'));
    const response = await app.inject({ method: 'PUT', url: '/workouts/w/correction', payload, headers: headers() });
    expect(response.statusCode).toBe(503); expect(response.body).not.toContain('synthetic private note');
  });
  it.each([400, 404, 409] as const)('returns explicit %s without recreating the workout', async (status) => {
    vi.mocked(correctWorkoutSession).mockRejectedValue(new WorkoutCorrectionError(status, 2));
    const response = await app.inject({ method: 'PUT', url: '/workouts/w/correction', payload, headers: headers() });
    expect(response.statusCode).toBe(status);
    if (status === 409) expect(response.json()).toMatchObject({ code: 'WORKOUT_CORRECTION_CONFLICT', currentRevision: 2 });
  });
});
