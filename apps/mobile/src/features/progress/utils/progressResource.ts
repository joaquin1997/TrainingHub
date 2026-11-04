/** A focus/retry read. Invalidated requests can never publish into a newer view/account. */
export type ProgressResourceState<T> = {
  data?: T;
  loading: boolean;
  error?: unknown;
  notFound?: boolean;
};
export function createProgressResource<T>(read: () => Promise<T>) {
  let generation = 0;
  let state: ProgressResourceState<T> = { loading: true };
  const listeners = new Set<() => void>();
  const publish = (next: ProgressResourceState<T>) => {
    state = next;
    listeners.forEach((listener) => listener());
  };
  return {
    getSnapshot: () => state,
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    invalidate() { generation += 1; },
    async load() {
      const request = ++generation;
      publish({ data: state.data, loading: true });
      try {
        const data = await read();
        if (request === generation) publish({ data, loading: false });
      } catch (error) {
        if (request !== generation) return;
        const status = (error as { status?: number } | null)?.status;
        // A rejected identity must never leave another account's history on screen.
        publish({ data: status === 401 || status === 404 ? undefined : state.data,
          error: status === 404 ? undefined : error, loading: false, notFound: status === 404 });
      }
    },
  };
}
