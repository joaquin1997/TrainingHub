import {
  getActiveWorkout,
  getActiveWorkoutOwnerId,
  hydrateActiveWorkout,
  subscribeActiveWorkout,
} from '@/features/workouts/state/workoutDraftStore';

import { parsePersistedActiveWorkout, serializeActiveWorkout } from './activeWorkoutEnvelope';
import type { ActiveWorkoutStorage } from './activeWorkoutStorage';

/** How long typing may go on before the draft is written (spec 0010 NFR). */
export const ACTIVE_WORKOUT_SAVE_DEBOUNCE_MS = 300;

const logStorageError = (error: unknown) => {
  // EF-4: the in-memory workout keeps working; only persistence is lost.
  console.warn('[activeWorkoutPersister] storage failed', error);
};

/**
 * Mirrors the active workout into storage (FR-2, FR-4): every change is
 * written after a short debounce, and clearing the workout (finish, discard,
 * sign-out) clears storage at once. Operations run in order through one queue,
 * so a late write can never resurrect a cleared workout.
 */
export function startActiveWorkoutPersister(
  storage: ActiveWorkoutStorage,
  {
    debounceMs = ACTIVE_WORKOUT_SAVE_DEBOUNCE_MS,
    onError = logStorageError,
  }: { debounceMs?: number; onError?: (error: unknown) => void } = {},
) {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let queue: Promise<void> = Promise.resolve();

  const enqueue = (operation: () => Promise<void>) => {
    queue = queue.then(operation).catch(onError);
  };

  const cancelPending = () => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
  };

  const write = () => {
    timer = null;
    const draft = getActiveWorkout();
    const ownerId = getActiveWorkoutOwnerId();
    if (draft && ownerId) {
      const value = serializeActiveWorkout(draft, ownerId);
      enqueue(() => storage.set(value));
    }
  };

  const unsubscribe = subscribeActiveWorkout(() => {
    cancelPending();

    if (getActiveWorkout() === null) {
      enqueue(() => storage.clear());
      return;
    }

    timer = setTimeout(write, debounceMs);
  });

  return {
    /** Writes a pending change now, e.g. when the app goes to the background. */
    flush() {
      if (timer) {
        cancelPending();
        write();
      }
      return queue;
    },
    stop() {
      unsubscribe();
      cancelPending();
    },
  };
}

export type HydrationResult = 'restored' | 'kept' | 'discarded' | 'none';

/**
 * Restores the stored workout for `ownerId` (FR-1, FR-3). A workout already in
 * memory wins (`kept`); one stored by someone else or in an unreadable format
 * is removed (`discarded`, EF-1/EF-2/FR-8); unreadable storage is treated as
 * empty (EF-4).
 */
export async function hydrateActiveWorkoutFromStorage(
  storage: ActiveWorkoutStorage,
  ownerId: string,
): Promise<HydrationResult> {
  if (getActiveWorkout()) {
    return 'kept';
  }

  let raw: string | null;
  try {
    raw = await storage.get();
  } catch (error) {
    logStorageError(error);
    return 'none';
  }

  // A workout may have started while storage was being read.
  if (getActiveWorkout()) {
    return 'kept';
  }

  const parsed = parsePersistedActiveWorkout(raw, ownerId);

  switch (parsed.kind) {
    case 'ok':
      hydrateActiveWorkout(parsed.draft, ownerId);
      return 'restored';
    case 'foreign':
    case 'invalid':
      await storage.clear().catch(logStorageError);
      return 'discarded';
    case 'empty':
      return 'none';
  }
}
