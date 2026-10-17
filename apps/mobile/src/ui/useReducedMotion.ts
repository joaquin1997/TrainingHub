import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

/**
 * Whether the system's Reduce Motion setting is on (spec 0034 FR-9). Motion
 * then changes state instantly; nothing is lost without it. On web,
 * react-native-web answers from `prefers-reduced-motion`.
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    let active = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((value) => {
        if (active) {
          setReduced(value);
        }
      })
      .catch(() => undefined);
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);

    return () => {
      active = false;
      subscription?.remove();
    };
  }, []);

  return reduced;
}
