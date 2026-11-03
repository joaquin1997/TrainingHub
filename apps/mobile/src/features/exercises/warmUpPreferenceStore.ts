import type { ExerciseWarmUpPreferences } from '@workout/domain';
import { DEFAULT_WARM_UP_PREFERENCES, isWarmUpPreferences } from '@/lib/warmUpContext';

export type WarmUpPreferenceSnapshot = {
  value: ExerciseWarmUpPreferences;
  pending: boolean;
  status: 'idle' | 'loading' | 'ready' | 'saving' | 'error';
  readOnly: boolean;
};
type Seed = Pick<WarmUpPreferenceSnapshot, 'value' | 'pending'>;
type Ports = {
  read(id: string): Promise<ExerciseWarmUpPreferences>;
  write(id: string, value: ExerciseWarmUpPreferences): Promise<ExerciseWarmUpPreferences>;
};
const EMPTY: WarmUpPreferenceSnapshot = { value: DEFAULT_WARM_UP_PREFERENCES, pending: false, status: 'idle', readOnly: false };
type Entry = { snapshot: WarmUpPreferenceSnapshot; version: number; reading?: Promise<void>; writing?: Promise<void> };

/** Single-account cache. Old asynchronous replies cannot cross an account boundary. */
export function createWarmUpPreferenceStore(ports: Ports) {
  let owner: string | null = null;
  let generation = 0;
  const entries = new Map<string, Entry>();
  const listeners = new Set<() => void>();
  const emit = () => listeners.forEach((notify) => notify());
  const entryFor = (id: string, seed?: Seed): Entry => {
    let entry = entries.get(id);
    if (!entry) {
      entry = { snapshot: seed && isWarmUpPreferences(seed.value)
        ? { ...EMPTY, value: seed.value, pending: seed.pending } : EMPTY, version: 0 };
      entries.set(id, entry);
    }
    return entry;
  };
  const set = (entry: Entry, patch: Partial<WarmUpPreferenceSnapshot>) => {
    entry.snapshot = { ...entry.snapshot, ...patch }; emit();
  };
  const current = (who: string, id: string, entry: Entry, epoch: number) => owner === who && generation === epoch && entries.get(id) === entry;
  const inaccessible = (error: unknown) => {
    const e = error as { status?: number; body?: { message?: string } } | null;
    return e?.status === 404 && e.body?.message === 'Exercise not found';
  };
  const flush = (who: string, id: string, entry: Entry): Promise<void> => {
    if (entry.writing) return entry.writing;
    const epoch = generation;
    entry.writing = (async () => {
      while (current(who, id, entry, epoch) && entry.snapshot.pending && !entry.snapshot.readOnly) {
        const version = entry.version;
        const value = entry.snapshot.value;
        set(entry, { status: 'saving' });
        try {
          const saved = await ports.write(id, value);
          if (!current(who, id, entry, epoch)) return;
          if (!isWarmUpPreferences(saved)) throw new Error('Invalid preference response');
          if (entry.version === version) set(entry, { value: saved, pending: false, status: 'ready' });
        } catch (error) {
          if (!current(who, id, entry, epoch)) return;
          if (entry.version === version) {
            set(entry, { status: 'error', readOnly: inaccessible(error) });
            break;
          }
        }
      }
    })().finally(() => { entry.writing = undefined; });
    return entry.writing;
  };
  return {
    activate(who: string | null) {
      if (owner === who) return;
      owner = who; generation += 1; entries.clear(); emit();
    },
    subscribe(notify: () => void) { listeners.add(notify); return () => { listeners.delete(notify); }; },
    snapshot(who: string | null, id: string): WarmUpPreferenceSnapshot {
      return who && who === owner ? entryFor(id).snapshot : EMPTY;
    },
    async load(who: string, id: string, seed?: Seed) {
      if (owner !== who) return;
      const entry = entryFor(id, seed);
      // snapshot() may already have allocated an empty entry during render.
      if (entry.snapshot === EMPTY && seed && isWarmUpPreferences(seed.value)) {
        set(entry, { value: seed.value, pending: seed.pending });
      }
      if (entry.snapshot.pending) return flush(who, id, entry);
      if (entry.reading) return entry.reading;
      const epoch = generation, version = entry.version;
      set(entry, { status: 'loading' });
      entry.reading = ports.read(id).then((value) => {
        if (!current(who, id, entry, epoch) || entry.version !== version) return;
        if (!isWarmUpPreferences(value)) throw new Error('Invalid preference response');
        set(entry, { value, pending: false, status: 'ready', readOnly: false });
      }).catch((error: unknown) => {
        if (current(who, id, entry, epoch) && entry.version === version) {
          set(entry, { status: 'error', readOnly: inaccessible(error) });
        }
      }).finally(() => { entry.reading = undefined; });
      return entry.reading;
    },
    update(who: string, id: string, value: ExerciseWarmUpPreferences) {
      if (owner !== who || !isWarmUpPreferences(value)) return Promise.resolve();
      const entry = entryFor(id);
      if (entry.snapshot.readOnly) return Promise.resolve();
      entry.version += 1;
      set(entry, { value: { ...value }, pending: true });
      return flush(who, id, entry);
    },
  };
}
