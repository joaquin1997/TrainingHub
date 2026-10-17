import { useEffect, useRef, useState } from 'react';
import { Vibration } from 'react-native';

import {
  isSetTimerFinished,
  setTimerDisplaySeconds,
  setTimerFillSeconds,
  type RunningSetTimer,
} from '@/features/workouts/utils/setTimer';

/**
 * Runs one set's timer (spec 0021 FR-4) and hands the time to `onFill` when
 * it stops, or when a countdown reaches zero (with a vibration).
 * TODO(sdd): screen state only — it stops if the workout screen unmounts;
 * move it into the draft (as 0018 does for rest) if that is ever needed.
 */
export function useSetTimer(onFill: (seconds: number) => void) {
  const [timer, setTimer] = useState<RunningSetTimer | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const onFillRef = useRef(onFill);
  onFillRef.current = onFill;

  useEffect(() => {
    if (!timer) {
      return;
    }

    const tick = () => {
      const current = Date.now();
      if (isSetTimerFinished(timer, current)) {
        Vibration.vibrate([0, 400, 200, 400]);
        onFillRef.current(setTimerFillSeconds(timer, current));
        setTimer(null);
        return;
      }
      setNow(current);
    };

    const interval = setInterval(tick, 250);
    return () => clearInterval(interval);
  }, [timer]);

  return {
    isRunning: timer !== null,
    displaySeconds: timer ? setTimerDisplaySeconds(timer, now) : 0,
    start(targetSeconds?: number) {
      const startedAt = Date.now();
      setNow(startedAt);
      setTimer({ startedAt, targetSeconds: targetSeconds || undefined });
    },
    stop() {
      if (timer) {
        onFillRef.current(setTimerFillSeconds(timer, Date.now()));
        setTimer(null);
      }
    },
  };
}
