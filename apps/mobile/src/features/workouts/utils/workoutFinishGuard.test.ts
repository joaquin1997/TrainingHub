import { describe, expect, it, vi } from 'vitest';
import { createWorkoutFinishGuard } from './workoutFinishGuard';

const deferred = <T>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
};

describe('Finish entry-point coordination (0046)', () => {
  it('allows only one save, including synchronous double taps from different controls', async () => {
    const guard = createWorkoutFinishGuard(() => 'a');
    const request = deferred<boolean>();
    const save = vi.fn(() => request.promise);
    const first = guard.save('a', save);
    expect(await guard.save('a', save)).toBe(false);
    const ask = vi.fn(async () => true);
    await guard.confirm('a', ask, save);
    expect(ask).not.toHaveBeenCalled();
    request.resolve(true);
    expect(await first).toBe(true);
    expect(save).toHaveBeenCalledTimes(1);
  });

  it('deduplicates confirmation and cancellation never saves', async () => {
    const guard = createWorkoutFinishGuard(() => 'a');
    const answer = deferred<boolean>();
    const ask = vi.fn(() => answer.promise);
    const finish = vi.fn(async () => true);
    const first = guard.confirm('a', ask, finish);
    await guard.confirm('a', ask, finish);
    answer.resolve(false);
    await first;
    expect(ask).toHaveBeenCalledTimes(1);
    expect(finish).not.toHaveBeenCalled();
    await guard.confirm('a', async () => true, finish);
    expect(finish).toHaveBeenCalledTimes(1);
  });

  it('never finishes a replacement workout after delayed confirmation', async () => {
    let id = 'a';
    const guard = createWorkoutFinishGuard(() => id);
    const answer = deferred<boolean>();
    const finish = vi.fn(async () => true);
    const confirming = guard.confirm('a', () => answer.promise, finish);
    id = 'b';
    answer.resolve(true);
    await confirming;
    expect(finish).not.toHaveBeenCalled();
    expect(await guard.save('a', finish)).toBe(false);
  });

  it('permits retry after a failed save or rejected confirmation', async () => {
    const guard = createWorkoutFinishGuard(() => 'a');
    await expect(guard.save('a', async () => { throw new Error('offline'); })).rejects.toThrow('offline');
    expect(await guard.save('a', async () => false)).toBe(false);
    expect(await guard.save('a', async () => true)).toBe(true);
    await expect(guard.confirm('a', async () => { throw new Error('dialog'); }, async () => {})).rejects.toThrow('dialog');
    const finish = vi.fn(async () => {});
    await guard.confirm('a', async () => true, finish);
    expect(finish).toHaveBeenCalledTimes(1);
  });
});
