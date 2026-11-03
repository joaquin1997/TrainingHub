import { describe, expect, it, vi } from 'vitest';
import { createWarmUpPreferenceStore } from './warmUpPreferenceStore';
import { DEFAULT_WARM_UP_PREFERENCES as defaults } from '@/lib/warmUpContext';
import type { ExerciseWarmUpPreferences as Pref } from '@workout/domain';
const deferred = <T>() => { let resolve!: (value: T) => void; let reject!: (error: unknown) => void; const promise = new Promise<T>((r, j) => { resolve = r; reject = j; }); return { promise, resolve, reject }; };

describe('owner-scoped warm-up preference delivery', () => {
  it('does not let an old read overwrite a newer edit and serializes overlapping saves', async () => {
    const read = deferred<Pref>(), first = deferred<Pref>();
    const write = vi.fn().mockImplementationOnce(() => first.promise).mockImplementation(async (_id, value) => value);
    const store = createWarmUpPreferenceStore({ read: () => read.promise, write });
    store.activate('alice');
    const loading = store.load('alice', 'e');
    const a = { ...defaults, incrementKg: 2.5 }, b = { ...defaults, incrementKg: 5 };
    const saving = store.update('alice', 'e', a);
    void store.update('alice', 'e', b);
    read.resolve(defaults); await loading;
    expect(store.snapshot('alice', 'e').value).toEqual(b);
    first.resolve(a); await saving;
    expect(write.mock.calls.map((call) => call[1])).toEqual([a, b]);
    expect(store.snapshot('alice', 'e')).toMatchObject({ value: b, pending: false, status: 'ready' });
  });
  it('retains failed local choices for the next preview and retries a restored pending seed', async () => {
    const read = vi.fn(async () => defaults), write = vi.fn().mockRejectedValueOnce(new Error('offline')).mockImplementation(async (_id, value) => value);
    const store = createWarmUpPreferenceStore({ read, write }); store.activate('alice');
    const value = { ...defaults, approachSetCount: 5 as const };
    await store.update('alice', 'e', value);
    expect(store.snapshot('alice', 'e')).toMatchObject({ value, pending: true, status: 'error' });
    await store.load('alice', 'e');
    expect(store.snapshot('alice', 'e')).toMatchObject({ value, pending: false });
    const restored = createWarmUpPreferenceStore({ read, write }); restored.activate('alice');
    restored.snapshot('alice', 'e');
    await restored.load('alice', 'e', { value, pending: true });
    expect(read).not.toHaveBeenCalled();
    expect(restored.snapshot('alice', 'e')).toMatchObject({ value, pending: false });
  });
  it('clears owner state and ignores old replies instead of saving queued choices under a new identity', async () => {
    const first = deferred<Pref>(); const write = vi.fn().mockImplementationOnce(() => first.promise);
    const store = createWarmUpPreferenceStore({ read: async () => defaults, write });
    store.activate('alice');
    const saving = store.update('alice', 'e', { ...defaults, incrementKg: 2.5 });
    void store.update('alice', 'e', { ...defaults, incrementKg: 5 });
    store.activate('bob'); first.resolve(defaults); await saving;
    expect(write).toHaveBeenCalledTimes(1);
    expect(store.snapshot('bob', 'e').value).toEqual(defaults);
    expect(store.snapshot('alice', 'e').value).toEqual(defaults);
  });
  it('keeps local configuration usable with an old API, but locks a specifically inaccessible exercise', async () => {
    const write = vi.fn(async (_id, value) => value);
    const store = createWarmUpPreferenceStore({ read: vi.fn().mockRejectedValueOnce({ status: 404, body: { message: 'Route not found' } }).mockRejectedValueOnce({ status: 404, body: { message: 'Exercise not found' } }), write });
    store.activate('alice'); await store.load('alice', 'old-api');
    expect(store.snapshot('alice', 'old-api').readOnly).toBe(false);
    await store.update('alice', 'old-api', { ...defaults, incrementKg: 2.5 });
    await store.load('alice', 'foreign');
    expect(store.snapshot('alice', 'foreign').readOnly).toBe(true);
    await store.update('alice', 'foreign', defaults);
    expect(write).toHaveBeenCalledTimes(1);
  });
});
