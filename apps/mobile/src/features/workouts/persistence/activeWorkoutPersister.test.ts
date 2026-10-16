import type { Routine } from '@workout/domain';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  buildWorkoutSessionDraft,
  clearActiveWorkout,
  getActiveWorkout,
  setActiveWorkout,
  startActiveWorkout,
} from '@/features/workouts/state/workoutDraftStore';

import { serializeActiveWorkout } from './activeWorkoutEnvelope';
import {
  hydrateActiveWorkoutFromStorage,
  startActiveWorkoutPersister,
} from './activeWorkoutPersister';
import {
  type ActiveWorkoutStorage,
  createMemoryActiveWorkoutStorage,
} from './activeWorkoutStorage';

const routine: Routine = {
  id: 'r1',
  userId: 'user-a',
  name: 'Push',
  exercises: [],
  createdAt: '',
  updatedAt: '',
};

function spyStorage(): ActiveWorkoutStorage & { writes: number } {
  const inner = createMemoryActiveWorkoutStorage();
  const storage = {
    writes: 0,
    get: () => inner.get(),
    set: async (value: string) => {
      storage.writes += 1;
      await inner.set(value);
    },
    clear: () => inner.clear(),
  };
  return storage;
}

describe('startActiveWorkoutPersister', () => {
  let stop: () => void = () => undefined;

  beforeEach(() => {
    vi.useFakeTimers();
    clearActiveWorkout();
  });

  afterEach(() => {
    stop();
    vi.useRealTimers();
  });

  it('writes once after a burst of changes', async () => {
    const storage = spyStorage();
    const persister = startActiveWorkoutPersister(storage, { debounceMs: 300 });
    stop = persister.stop;

    const draft = startActiveWorkout(routine, 'kg', 'user-a');
    setActiveWorkout({ ...draft, notes: 'a' });
    setActiveWorkout({ ...draft, notes: 'ab' });
    await vi.advanceTimersByTimeAsync(299);
    expect(storage.writes).toBe(0);

    await vi.advanceTimersByTimeAsync(1);
    await persister.flush();
    expect(storage.writes).toBe(1);
    expect(await storage.get()).toContain('"notes":"ab"');
  });

  it('flush writes a pending change immediately', async () => {
    const storage = spyStorage();
    const persister = startActiveWorkoutPersister(storage);
    stop = persister.stop;

    startActiveWorkout(routine, 'kg', 'user-a');
    await persister.flush();

    expect(storage.writes).toBe(1);
  });

  it('clears storage when the workout ends, and a pending write cannot bring it back', async () => {
    const storage = spyStorage();
    const persister = startActiveWorkoutPersister(storage);
    stop = persister.stop;

    startActiveWorkout(routine, 'kg', 'user-a');
    await persister.flush();
    setActiveWorkout({ ...getActiveWorkout()!, notes: 'late' });
    clearActiveWorkout();
    await vi.runAllTimersAsync();
    await persister.flush();

    expect(await storage.get()).toBeNull();
  });

  it('keeps the workout in memory when storage fails (EF-4)', async () => {
    const onError = vi.fn();
    const failing: ActiveWorkoutStorage = {
      get: async () => null,
      set: async () => {
        throw new Error('disk full');
      },
      clear: async () => undefined,
    };
    const persister = startActiveWorkoutPersister(failing, { onError });
    stop = persister.stop;

    startActiveWorkout(routine, 'kg', 'user-a');
    await persister.flush();

    expect(onError).toHaveBeenCalled();
    expect(getActiveWorkout()).not.toBeNull();
  });
});

describe('hydrateActiveWorkoutFromStorage', () => {
  beforeEach(() => {
    clearActiveWorkout();
  });

  it('restores the owner workout', async () => {
    const storage = createMemoryActiveWorkoutStorage();
    const draft = buildWorkoutSessionDraft(routine);
    await storage.set(serializeActiveWorkout(draft, 'user-a'));

    expect(await hydrateActiveWorkoutFromStorage(storage, 'user-a')).toBe('restored');
    expect(getActiveWorkout()).toEqual(draft);
  });

  it('discards and removes a workout stored by someone else', async () => {
    const storage = createMemoryActiveWorkoutStorage();
    await storage.set(serializeActiveWorkout(buildWorkoutSessionDraft(routine), 'user-a'));

    expect(await hydrateActiveWorkoutFromStorage(storage, 'user-b')).toBe('discarded');
    expect(getActiveWorkout()).toBeNull();
    expect(await storage.get()).toBeNull();
  });

  it('removes unreadable data without crashing', async () => {
    const storage = createMemoryActiveWorkoutStorage();
    await storage.set('{broken');

    expect(await hydrateActiveWorkoutFromStorage(storage, 'user-a')).toBe('discarded');
    expect(await storage.get()).toBeNull();
  });

  it('leaves a workout already in memory alone', async () => {
    const storage = createMemoryActiveWorkoutStorage();
    await storage.set(serializeActiveWorkout(buildWorkoutSessionDraft(routine), 'user-a'));
    const inMemory = startActiveWorkout({ ...routine, id: 'r2' }, 'kg', 'user-a');

    expect(await hydrateActiveWorkoutFromStorage(storage, 'user-a')).toBe('kept');
    expect(getActiveWorkout()).toBe(inMemory);
  });

  it('treats unreadable storage as empty (EF-4)', async () => {
    const failing: ActiveWorkoutStorage = {
      get: async () => {
        throw new Error('unavailable');
      },
      set: async () => undefined,
      clear: async () => undefined,
    };
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    expect(await hydrateActiveWorkoutFromStorage(failing, 'user-a')).toBe('none');
  });
});
