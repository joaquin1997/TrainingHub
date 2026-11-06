import { describe, expect, it } from 'vitest';
import { createProgressResource } from './progressResource';
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
describe('progress focus/retry ownership', () => {
  it('keeps loaded data on refresh failure and recovers on retry', async () => {
    let failed = false;
    const resource = createProgressResource(async () => { if (failed) throw new Error('offline'); return [1]; });
    await resource.load(); failed = true;
    await resource.load();
    expect(resource.getSnapshot()).toMatchObject({ data: [1], loading: false, error: expect.any(Error) });
    failed = false; await resource.load();
    expect(resource.getSnapshot()).toEqual({ data: [1], loading: false });
  });
  it('distinguishes initial failure, successful empty, and no history', async () => {
    const failure = createProgressResource(async () => { throw new Error('offline'); });
    await failure.load(); expect(failure.getSnapshot()).toMatchObject({ data: undefined, error: expect.any(Error) });
    const empty = createProgressResource(async () => []);
    await empty.load(); expect(empty.getSnapshot()).toEqual({ data: [], loading: false });
    const missing = createProgressResource(async () => { throw { status: 404 }; });
    await missing.load(); expect(missing.getSnapshot()).toMatchObject({ notFound: true, error: undefined });
  });
  it('ignores late older responses when retry finishes first', async () => {
    const first = deferred<number>(); const second = deferred<number>(); let calls = 0;
    const resource = createProgressResource(() => ++calls === 1 ? first.promise : second.promise);
    const old = resource.load(); const newer = resource.load();
    second.resolve(2); await newer; first.resolve(1); await old;
    expect(resource.getSnapshot().data).toBe(2);
  });
  it('invalidates requests on blur/unmount and keeps separate accounts separate', async () => {
    const pending = deferred<number>(); const alice = createProgressResource(() => pending.promise);
    const read = alice.load(); alice.invalidate();
    const bob = createProgressResource(async () => 2);
    await bob.load(); pending.resolve(1); await read;
    expect(alice.getSnapshot().data).toBeUndefined(); expect(bob.getSnapshot().data).toBe(2);
  });
  it('clears loaded history after identity rejection', async () => {
    let reject = false;
    const resource = createProgressResource(async () => { if (reject) throw { status: 401 }; return [1]; });
    await resource.load(); reject = true; await resource.load();
    expect(resource.getSnapshot().data).toBeUndefined();
  });
});
