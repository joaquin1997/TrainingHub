/**
 * Storage boundary for the active workout (spec 0010), like `TokenStorage`:
 * the persister depends on this interface, not on a concrete store. Values are
 * the serialized envelope from `activeWorkoutEnvelope.ts`.
 */
export interface ActiveWorkoutStorage {
  get(): Promise<string | null>;
  set(value: string): Promise<void>;
  clear(): Promise<void>;
}

/** In-memory storage: the test double, and the fallback when the device store fails (EF-4). */
export function createMemoryActiveWorkoutStorage(): ActiveWorkoutStorage {
  let stored: string | null = null;
  return {
    get: async () => stored,
    set: async (value) => {
      stored = value;
    },
    clear: async () => {
      stored = null;
    },
  };
}
