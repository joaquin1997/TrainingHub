import type { ActiveWorkoutStore } from '@/features/workouts/liveActivity/liveWorkoutController';
import {
  getActiveWorkout,
  restPhase,
  setActiveWorkout,
  skipRest,
  subscribeActiveWorkout,
  type WorkoutSessionDraft,
} from '@/features/workouts/state/workoutDraftStore';

import type { RestAlertContent, RestAlerts } from './restAlerts';

const draftStore: ActiveWorkoutStore = {
  get: getActiveWorkout,
  set: setActiveWorkout,
  subscribe: subscribeActiveWorkout,
};

const logAlertError = (error: unknown) => {
  // The rest still runs and alerts inside the app.
  console.warn('[restTimerRunner] rest alert failed', error);
};

/**
 * Turns the running rest of the active workout into alerts (spec 0018), for
 * the whole app and independent of any screen:
 *
 * - a new or moved end schedules the system alert at that instant and arms an
 *   in-app timeout; the first schedule of the run asks for permission (EF-1);
 * - a rest that is gone (skipped, workout finished or discarded) cancels the
 *   alert (EF-2);
 * - at the end, the app vibrates if it is in front and clears the rest; a rest
 *   found long past its end is cleared silently (EF-3).
 *
 * Alert calls run in order through one queue.
 */
export function startRestTimerRunner({
  alerts,
  vibrate,
  isAppActive,
  alertContent = () => ({ title: '', body: '' }),
  store = draftStore,
  now = () => new Date(),
  onError = logAlertError,
}: {
  alerts: RestAlerts;
  vibrate: () => void;
  isAppActive: () => boolean;
  alertContent?: (draft: WorkoutSessionDraft) => RestAlertContent;
  store?: ActiveWorkoutStore;
  now?: () => Date;
  onError?: (error: unknown) => void;
}) {
  /** The end whose alert is scheduled, or null when none is. */
  let scheduledEndsAt: string | null = null;
  let permissionAsked = false;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let queue: Promise<void> = Promise.resolve();

  const run = (operation: () => Promise<unknown>) => {
    queue = queue.then(operation).then(
      () => undefined,
      onError,
    );
  };

  const clearTimer = () => {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
  };

  const armTimer = (endsAt: string) => {
    clearTimer();
    const delay = Math.max(0, new Date(endsAt).getTime() - now().getTime());
    timer = setTimeout(() => {
      timer = null;
      sync();
    }, delay);
  };

  const cancelScheduled = () => {
    clearTimer();
    if (scheduledEndsAt !== null) {
      scheduledEndsAt = null;
      run(() => alerts.cancel());
    }
  };

  const sync = () => {
    const draft = store.get();
    const rest = draft?.rest;

    if (!draft || !rest) {
      cancelScheduled();
      return;
    }

    const phase = restPhase(rest, now());

    if (phase !== 'running') {
      if (phase === 'ended' && isAppActive()) {
        vibrate();
      }
      // The system alert is due now or already delivered: never cancel it
      // here, or a phone just locked might not buzz.
      scheduledEndsAt = null;
      clearTimer();
      store.set(skipRest(draft));
      return;
    }

    if (rest.endsAt === scheduledEndsAt) {
      if (timer === null) {
        armTimer(rest.endsAt);
      }
      return;
    }

    scheduledEndsAt = rest.endsAt;
    const at = new Date(rest.endsAt);
    const content = alertContent(draft);
    const askPermission = !permissionAsked;
    permissionAsked = true;
    run(async () => {
      if (askPermission) {
        await alerts.requestPermission();
      }
      await alerts.schedule(at, content);
    });
    armTimer(rest.endsAt);
  };

  const unsubscribe = store.subscribe(sync);
  sync();

  return {
    /** Re-checks the rest, e.g. when the app comes back to the foreground. */
    check: sync,
    /** Resolves when every queued alert call has run (tests). */
    idle: () => queue,
    stop() {
      unsubscribe();
      cancelScheduled();
    },
  };
}
