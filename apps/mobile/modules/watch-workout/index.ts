import { requireOptionalNativeModule } from 'expo';

/** A message from the watch app: a queued request, or its latest calories. */
export type WatchMessage = { kind: 'event' | 'metrics'; json: string };

type WatchWorkoutNative = {
  /** Whether a paired watch has the app installed; false until the link is up. */
  isWatchAppInstalled(): boolean;
  /**
   * Launches the watch app into a workout (HealthKit), once the link is up and
   * only when the app is installed; resolves whether it was asked.
   */
  startWatchApp(): Promise<boolean>;
  /** Replaces what the watch shows (latest wins), sent once the link is up. */
  sendContext(json: string): Promise<void>;
  /** Messages received before the first listener are kept and delivered to it. */
  addListener(
    event: 'onMessage',
    listener: (message: WatchMessage) => void,
  ): { remove(): void };
};

/** Null on platforms without the native module (Android, web, Expo Go, older builds). */
export const WatchWorkout = requireOptionalNativeModule<WatchWorkoutNative>('WatchWorkout');
