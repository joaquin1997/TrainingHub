import { useEffect, useState } from 'react';

import { activeDurationSeconds } from '@/lib/format';

interface PauseState {
  /** When the current pause began; the clock is frozen there while set. */
  pausedAt?: string;
  /** Seconds of pauses already ended, subtracted from the elapsed time. */
  pausedSeconds?: number;
}

/**
 * Active seconds since `startIso` (spec 0011): elapsed time minus paused time,
 * updated every second and frozen while paused. Returns 0 when no start is
 * provided.
 */
export function useElapsedSeconds(startIso?: string, pause: PauseState = {}) {
  const { pausedAt, pausedSeconds = 0 } = pause;
  const compute = () =>
    startIso
      ? activeDurationSeconds(
          startIso,
          pausedAt ?? new Date().toISOString(),
          pausedSeconds,
        )
      : 0;
  const [elapsed, setElapsed] = useState(compute);

  useEffect(() => {
    const update = () => setElapsed(compute());

    update();
    if (!startIso || pausedAt) {
      return;
    }

    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
    // `compute` reads only these three values.
  }, [startIso, pausedAt, pausedSeconds]);

  return elapsed;
}
