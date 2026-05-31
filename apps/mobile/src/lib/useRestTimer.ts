import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * A countdown rest timer. `start(seconds)` begins a countdown; `remaining`
 * ticks down to 0 and stops. `onComplete` (if provided) fires once at 0.
 */
export function useRestTimer(onComplete?: () => void) {
  const [remaining, setRemaining] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const endRef = useRef<number | null>(null);
  const completeRef = useRef(onComplete);
  completeRef.current = onComplete;

  useEffect(() => {
    if (!isRunning) {
      return;
    }

    const interval = setInterval(() => {
      const end = endRef.current;
      if (end == null) {
        return;
      }

      const left = Math.max(0, Math.round((end - Date.now()) / 1000));
      setRemaining(left);

      if (left <= 0) {
        setIsRunning(false);
        endRef.current = null;
        completeRef.current?.();
      }
    }, 250);

    return () => clearInterval(interval);
  }, [isRunning]);

  const start = useCallback((seconds: number) => {
    endRef.current = Date.now() + seconds * 1000;
    setRemaining(seconds);
    setIsRunning(true);
  }, []);

  const skip = useCallback(() => {
    setIsRunning(false);
    endRef.current = null;
    setRemaining(0);
  }, []);

  /** Add or subtract seconds from a running countdown (never below 0). */
  const adjust = useCallback((deltaSeconds: number) => {
    if (endRef.current == null) {
      return;
    }

    endRef.current = Math.max(Date.now(), endRef.current + deltaSeconds * 1000);
    setRemaining(Math.max(0, Math.round((endRef.current - Date.now()) / 1000)));
  }, []);

  return { remaining, isRunning, start, skip, adjust };
}
