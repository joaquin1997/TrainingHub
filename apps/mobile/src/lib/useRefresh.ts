import { useCallback, useState } from 'react';

/**
 * Wires a list screen's load function to a RefreshControl: tracks the refreshing
 * flag and re-runs the loader on pull-to-refresh.
 */
export function useRefresh(load: () => Promise<unknown>) {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    void load().finally(() => setIsRefreshing(false));
  }, [load]);

  return { isRefreshing, onRefresh };
}
