import { useSyncExternalStore } from 'react';
import { AccessibilityInfo } from 'react-native';

/**
 * Whether the system's Reduce Motion setting is on (spec 0034 FR-9). Motion
 * then changes state instantly; nothing is lost without it. One subscription
 * for the whole app (every set row reads it), started on first use; on web,
 * react-native-web answers from `prefers-reduced-motion`.
 */
let reduced = false;
let started = false;
const listeners = new Set<() => void>();

function set(value: boolean) {
  if (value !== reduced) {
    reduced = value;
    listeners.forEach((listener) => listener());
  }
}

function start() {
  if (started) {
    return;
  }
  started = true;
  AccessibilityInfo.isReduceMotionEnabled().then(set).catch(() => undefined);
  AccessibilityInfo.addEventListener('reduceMotionChanged', set);
}

function subscribe(listener: () => void) {
  start();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, () => reduced, () => reduced);
}
