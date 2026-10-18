import type { HealthWorkoutPayload, LiveWorkoutBridge } from '@workout/domain';

import {
  getActiveWorkout,
  setActiveWorkout,
  subscribeActiveWorkout,
  type WorkoutSessionDraft,
} from '@/features/workouts/state/workoutDraftStore';

import {
  reconcile,
  samePause,
  sameProgress,
  sameRest,
  toLiveWorkoutPayload,
} from './liveWorkoutPayload';

export interface ActiveWorkoutStore {
  get(): WorkoutSessionDraft | null;
  set(draft: WorkoutSessionDraft): void;
  subscribe(listener: () => void): () => void;
}

const draftStore: ActiveWorkoutStore = {
  get: getActiveWorkout,
  set: setActiveWorkout,
  subscribe: subscribeActiveWorkout,
};

const logBridgeError = (error: unknown) => {
  // EF-1: the workout works exactly as without the live status.
  console.warn('[liveWorkoutController] live status failed', error);
};

type ShownPause = { pausedAt?: string; pausedSeconds: number };

/**
 * Drives the live workout surface from the active workout (spec 0012): starts
 * it when a workout starts, pushes pause and rest (spec 0018) changes and the
 * workout's progress — up-next set and sets done (spec 0035 FR-17) — ends it
 * when the workout is finished or discarded, and applies pauses made on the
 * surface itself. Typing a value pushes nothing unless it changes the up-next
 * text. Bridge calls run in order through one queue.
 */
export function startLiveWorkoutController({
  bridge,
  store = draftStore,
  upNext,
  onError = logBridgeError,
}: {
  bridge: LiveWorkoutBridge;
  store?: ActiveWorkoutStore;
  /** The up-next set as display text, in the app's language (spec 0035). */
  upNext?: (draft: WorkoutSessionDraft) => string | null;
  onError?: (error: unknown) => void;
}) {
  let shownId: string | null = null;
  let shownPause: ShownPause | null = null;
  let shownRestEndsAt: string | undefined;
  // A start already queued for this workout; reconcile must not add another.
  let pendingStartId: string | null = null;
  let lastPayload: HealthWorkoutPayload | null = null;
  let activeEnergyKcal: number | null = null;
  let queue: Promise<void> = Promise.resolve();

  const run = (operation: () => Promise<void>) => {
    queue = queue.then(operation).catch(onError);
    return queue;
  };

  const payloadFor = (draft: WorkoutSessionDraft) => {
    lastPayload = toLiveWorkoutPayload(draft, activeEnergyKcal, upNext);
    return lastPayload;
  };

  const markShown = (draft: WorkoutSessionDraft) => {
    shownId = draft.clientId;
    shownPause = { pausedAt: draft.pausedAt, pausedSeconds: draft.pausedSeconds ?? 0 };
    shownRestEndsAt = draft.rest?.endsAt;
  };

  const show = (draft: WorkoutSessionDraft) => {
    markShown(draft);
    const payload = payloadFor(draft);
    pendingStartId = draft.clientId;
    void run(async () => {
      try {
        await bridge.startLiveWorkout(payload);
      } finally {
        if (pendingStartId === payload.workoutSessionId) {
          pendingStartId = null;
        }
      }
    });
  };

  const hide = () => {
    const payload = lastPayload;
    shownId = null;
    shownPause = null;
    activeEnergyKcal = null;
    if (payload) {
      void run(() => bridge.finishLiveWorkout(payload));
    }
  };

  const sync = () => {
    const draft = store.get();

    if (!draft) {
      if (shownId) {
        hide();
      }
      return;
    }

    if (draft.clientId !== shownId) {
      activeEnergyKcal = null;
      show(draft);
      return;
    }

    const shownProgress = lastPayload;
    const next = toLiveWorkoutPayload(draft, activeEnergyKcal, upNext);
    if (
      !shownPause ||
      !samePause(draft, shownPause) ||
      !sameRest(draft, shownRestEndsAt) ||
      !sameProgress(shownProgress, next)
    ) {
      markShown(draft);
      const payload = payloadFor(draft);
      void run(() => bridge.updateLiveWorkout(payload));
    }
  };

  /** Applies a pause state that came from the surface, without echoing it back. */
  const adoptPause = (pausedAt: string | undefined, pausedSeconds: number) => {
    const draft = store.get();
    if (!draft) {
      return;
    }
    shownPause = { pausedAt, pausedSeconds };
    store.set({ ...draft, pausedAt, pausedSeconds });
  };

  const reconcileNow = () =>
    run(async () => {
      if (!bridge.getLiveWorkoutState) {
        sync();
        return;
      }

      const state = await bridge.getLiveWorkoutState();
      const draft = store.get();
      const action = reconcile(draft, state);

      switch (action.kind) {
        case 'end':
          // An orphan from a previous run (EF-3): its payload is not known,
          // and ending does not need it.
          shownId = null;
          shownPause = null;
          await bridge.finishLiveWorkout(
            lastPayload ?? {
              workoutSessionId: state?.workoutSessionId ?? '',
              startedAt: new Date().toISOString(),
              exerciseCount: 0,
            },
          );
          return;
        case 'start':
          if (draft && pendingStartId !== draft.clientId) {
            markShown(draft);
            await bridge.startLiveWorkout(payloadFor(draft));
          }
          return;
        case 'adoptPause':
          if (draft) {
            shownId = draft.clientId;
            payloadFor(draft);
          }
          adoptPause(action.pausedAt, action.pausedSeconds);
          return;
        case 'none':
          if (draft) {
            markShown(draft);
            payloadFor(draft);
          }
          return;
      }
    });

  const unsubscribeStore = store.subscribe(sync);
  const unsubscribeSurface = bridge.onLiveWorkoutStateChange?.((state) => {
    const draft = store.get();
    if (draft && state.workoutSessionId === draft.clientId && !samePause(draft, state)) {
      adoptPause(state.pausedAt, state.pausedSeconds);
    }
  });

  void reconcileNow();

  return {
    /** Re-aligns surface and workout, e.g. when the app becomes active. */
    reconcile: reconcileNow,
    /** Shows a new active-energy reading (task 7 feeds it). */
    setActiveEnergyKcal(kcal: number | null) {
      activeEnergyKcal = kcal;
      const draft = store.get();
      if (draft && draft.clientId === shownId) {
        const payload = payloadFor(draft);
        void run(() => bridge.updateLiveWorkout(payload));
      }
    },
    /** Resolves when every queued bridge call has run (tests). */
    idle: () => queue,
    stop() {
      unsubscribeStore();
      unsubscribeSurface?.();
    },
  };
}
