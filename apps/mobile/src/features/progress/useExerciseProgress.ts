import { useCallback, useMemo, useRef, useSyncExternalStore } from 'react';
import { useFocusEffect } from 'expo-router';
import { createProgressResource } from './utils/progressResource';

/** Callers bind account, exercise and language into the memoized read callback. */
export function useProgressResource<T>(identity: string, read: () => Promise<T>) {
  const latestRead = useRef(read);
  latestRead.current = read;
  const resource = useMemo(() => createProgressResource(() => latestRead.current()), [identity]);
  const state = useSyncExternalStore(resource.subscribe, resource.getSnapshot, resource.getSnapshot);
  useFocusEffect(useCallback(() => {
    void resource.load();
    return () => resource.invalidate();
  }, [resource, read]));
  return { ...state, reload: resource.load };
}
