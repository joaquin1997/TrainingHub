import type { WatchWorkoutBridge } from '@workout/domain';

import { WatchWorkout } from '../../../../modules/watch-workout';

import {
  decodeWatchMessage,
  encodeActiveContext,
  encodeEndContext,
  type WatchLabels,
} from './appleWatchWire';

let watchLabels: WatchLabels = {
  done: 'Done',
  pause: 'Pause',
  resume: 'Resume',
  finish: 'Finish',
  rest: 'Rest',
  paused: 'Paused',
  finishOnPhone: 'Confirm on your iPhone',
  allDone: 'All sets done',
  waiting: 'Start a workout on your iPhone',
  setOf: (number, count, isWarmup) =>
    isWarmup ? `Warm-up ${number} of ${count}` : `Set ${number} of ${count}`,
  more: 'More',
  reps: 'reps',
  discard: 'Discard',
  discardTitle: 'Discard this workout?',
  cancel: 'Cancel',
  connectToDiscard: 'Connect to your iPhone to discard',
  waitingPhone: 'Waiting for your iPhone…',
  discardLost: (count) =>
    count > 0 ? `${count} sets done will be lost.` : 'No sets done yet.',
};

/** Texts shown on the watch; set from the app's language. */
export function setWatchLabels(labels: WatchLabels) {
  watchLabels = labels;
}

/**
 * The TrainingHub watch app behind `WatchWorkoutBridge` (spec 0025), over the
 * `watch-workout` module: WatchConnectivity carries the state and the
 * requests, HealthKit launches the watch app. A no-op without the module.
 */
export const appleWatchWorkoutBridge: WatchWorkoutBridge = {
  providerId: 'apple-health',
  async startWatchWorkout(snapshot) {
    if (!WatchWorkout) {
      return;
    }
    // The state first, so the watch app knows the workout when it launches.
    await WatchWorkout.sendContext(encodeActiveContext(snapshot, watchLabels));
    await WatchWorkout.startWatchApp();
  },
  async updateWatchWorkout(snapshot) {
    await WatchWorkout?.sendContext(encodeActiveContext(snapshot, watchLabels));
  },
  async endWatchWorkout(workoutSessionId, outcome) {
    await WatchWorkout?.sendContext(encodeEndContext(workoutSessionId, outcome));
  },
  onWatchWorkoutEvent(listener) {
    const subscription = WatchWorkout?.addListener('onMessage', (message) => {
      const event = decodeWatchMessage(message.kind, message.json);
      if (event) {
        listener(event);
      }
    });
    return () => subscription?.remove();
  },
};
