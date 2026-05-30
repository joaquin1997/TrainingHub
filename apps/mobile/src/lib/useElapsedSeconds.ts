import { useEffect, useState } from 'react';

import { durationSecondsBetween } from '@/lib/format';

/**
 * Seconds elapsed since `startIso`, updated every second. Returns 0 when no
 * start is provided.
 */
export function useElapsedSeconds(startIso?: string) {
  const [elapsed, setElapsed] = useState(() =>
    startIso ? durationSecondsBetween(startIso, new Date().toISOString()) : 0,
  );

  useEffect(() => {
    if (!startIso) {
      setElapsed(0);
      return;
    }

    const update = () =>
      setElapsed(durationSecondsBetween(startIso, new Date().toISOString()));

    update();
    const interval = setInterval(update, 1000);

    return () => clearInterval(interval);
  }, [startIso]);

  return elapsed;
}
