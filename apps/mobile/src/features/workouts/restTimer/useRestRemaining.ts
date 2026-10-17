import { useEffect, useState } from 'react';

import {
  restRemainingSeconds,
  type RunningRest,
} from '@/features/workouts/state/workoutDraftStore';

/**
 * Seconds left in the running rest, for display (spec 0018). Derived from its
 * absolute end, so every screen shows the same countdown; 0 with no rest.
 */
export function useRestRemaining(rest: RunningRest | undefined): number {
  const endsAt = rest?.endsAt;
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!endsAt) {
      return;
    }

    setNow(Date.now());
    const interval = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(interval);
  }, [endsAt]);

  return rest ? restRemainingSeconds(rest, new Date(now)) : 0;
}
