import type {
  WatchWorkoutBridge,
  WatchWorkoutEvent,
  WatchWorkoutOutcome,
  WatchWorkoutSnapshot,
} from '@workout/domain';

import type { ActiveWorkoutStore } from '@/features/workouts/liveActivity/liveWorkoutController';
import {
  getActiveWorkout,
  getLatestCompletedWorkout,
  setActiveWorkout,
  subscribeActiveWorkout,
} from '@/features/workouts/state/workoutDraftStore';

import { applyWatchEvent, sameSnapshot, toWatchSnapshot } from './watchProtocol';

const draftStore: ActiveWorkoutStore = {
  get: getActiveWorkout,
  set: setActiveWorkout,
  subscribe: subscribeActiveWorkout,
};

const logBridgeError = (error: unknown) => {
  // The workout works exactly as without a watch.
  console.warn('[watchWorkoutController] watch failed', error);
};

/** How many applied request ids are remembered to drop a repeat (EF-1). */
const SEEN_IDS = 200;

/**
 * Runs the active workout on the watch (spec 0025): starts it there when a
 * workout starts (FR-2), sends every change of what the watch shows, ends it
 * as finished (saved to Health) or discarded, and applies the watch's
 * requests to the workout in the order they arrive (EF-1). The phone stays
 * the source of the logged data. Bridge calls run in order through one queue.
 */
export function startWatchWorkoutController({
  bridge,
  defaultRestSeconds,
  store = draftStore,
  wasFinished = (clientId) => getLatestCompletedWorkout()?.clientId === clientId,
  onActiveEnergy,
  onFinishRequested,
  onDiscardRequested,
  onError = logBridgeError,
}: {
  bridge: WatchWorkoutBridge;
  /** The Settings default rest, read when needed. */
  defaultRestSeconds: () => number;
  store?: ActiveWorkoutStore;
  /** Whether the workout that just left the store was saved, not discarded. */
  wasFinished?: (clientId: string) => boolean;
  /** kcal the watch measured for the active workout (FR-3). */
  onActiveEnergy?: (clientId: string, kcal: number) => void;
  /** Finish tapped on the watch; the phone asks for confirmation. */
  onFinishRequested?: (clientId: string) => void;
  /** Discard confirmed on the watch, for the workout in progress (spec 0035). */
  onDiscardRequested?: (clientId: string) => void;
  onError?: (error: unknown) => void;
}) {
  let shownId: string | null = null;
  let shown: WatchWorkoutSnapshot | null = null;
  const seen: string[] = [];
  let queue: Promise<void> = Promise.resolve();

  const run = (operation: () => Promise<void>) => {
    queue = queue.then(operation).catch(onError);
  };

  const end = (clientId: string) => {
    const outcome: WatchWorkoutOutcome = wasFinished(clientId) ? 'finished' : 'discarded';
    run(() => bridge.endWatchWorkout(clientId, outcome));
  };

  const sync = () => {
    const draft = store.get();

    if (!draft || draft.clientId !== shownId) {
      if (shownId) {
        end(shownId);
      }
      shownId = null;
      shown = null;
      if (!draft) {
        return;
      }
    }

    const snapshot = toWatchSnapshot(draft, defaultRestSeconds());
    if (shownId === null) {
      shownId = draft.clientId;
      shown = snapshot;
      run(() => bridge.startWatchWorkout(snapshot));
      return;
    }

    if (!shown || !sameSnapshot(shown, snapshot)) {
      shown = snapshot;
      run(() => bridge.updateWatchWorkout(snapshot));
    }
  };

  const firstTime = (id: string) => {
    if (seen.includes(id)) {
      return false;
    }
    seen.push(id);
    if (seen.length > SEEN_IDS) {
      seen.shift();
    }
    return true;
  };

  const handleEvent = (event: WatchWorkoutEvent) => {
    const draft = store.get();
    if (!draft || event.workoutSessionId !== draft.clientId) {
      return;
    }

    switch (event.kind) {
      case 'activeEnergy':
        onActiveEnergy?.(draft.clientId, event.kcal);
        return;
      case 'finishRequested':
        if (firstTime(event.id)) {
          onFinishRequested?.(draft.clientId);
        }
        return;
      // A request for a workout that already ended was dropped above (EF-9).
      case 'discardRequested':
        if (firstTime(event.id)) {
          onDiscardRequested?.(draft.clientId);
        }
        return;
      default: {
        if (!firstTime(event.id)) {
          return;
        }
        const next = applyWatchEvent(draft, event, defaultRestSeconds());
        if (next !== draft) {
          store.set(next);
        }
      }
    }
  };

  const unsubscribeStore = store.subscribe(sync);
  const unsubscribeWatch = bridge.onWatchWorkoutEvent(handleEvent);
  sync();

  return {
    /** Resolves when every queued bridge call has run (tests). */
    idle: () => queue,
    stop() {
      unsubscribeStore();
      unsubscribeWatch();
    },
  };
}
