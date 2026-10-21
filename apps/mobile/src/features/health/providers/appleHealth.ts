import type {
  HealthIntegration,
  HealthWorkoutPayload,
  LiveWorkoutBridge,
  LiveWorkoutState,
} from '@workout/domain';

import { HealthEnergy } from '../../../../modules/health-energy';
import { WorkoutLiveActivity } from '../../../../modules/workout-live-activity';

export const appleHealthIntegration: HealthIntegration = {
  providerId: 'apple-health',
  displayName: 'Apple Health',
  async isAvailable() {
    return HealthEnergy?.isAvailable() ?? false;
  },
  // Resolves true once the prompt was answered; HealthKit never says whether
  // read access was granted (a denial reads as "no data").
  async requestPermissions() {
    return (await HealthEnergy?.requestReadAuthorization()) ?? false;
  },
  async readActiveEnergyKcal(since: string, until?: string) {
    if (!HealthEnergy) {
      return null;
    }

    return HealthEnergy.activeEnergyKcal(
      Date.parse(since),
      until ? Date.parse(until) : Date.now(),
    );
  },
};

/** Texts shown on the Live Activity; set from the app's language before a start. */
export interface LiveActivityLabels {
  paused: string;
  pause: string;
  resume: string;
  finish: string;
  /** Spec 0035: the discard link, "Next: …" during a rest, no set left. */
  discard: string;
  next: string;
  allDone: string;
  /** Spoken form of the sets ring, "9 of 20 sets done". */
  setsDone: (done: number, total: number) => string;
}

let liveActivityLabels: LiveActivityLabels = {
  paused: 'Paused',
  pause: 'Pause',
  resume: 'Resume',
  finish: 'Finish',
  discard: 'Discard',
  next: 'Next',
  allDone: 'All sets done',
  setsDone: (done, total) => `${done} of ${total} sets done`,
};

export function setLiveActivityLabels(labels: LiveActivityLabels) {
  liveActivityLabels = labels;
}

const toMs = (iso?: string) => (iso ? Date.parse(iso) : null);
/**
 * A rest's end only while it is ahead (spec 0040 FR-3): an update after the
 * rest ended would otherwise clear the stale date and leave the countdown
 * showing 0:00 on the lock screen.
 */
export const runningRestEndMs = (iso?: string, now: number = Date.now()) => {
  const ms = toMs(iso);
  return ms !== null && ms > now ? ms : null;
};
const toIso = (ms: number | null | undefined) =>
  ms == null ? undefined : new Date(ms).toISOString();
const toKcal = (kcal: number | null | undefined) =>
  kcal == null ? null : Math.round(kcal);

/** The progress fields of the activity (spec 0035). */
function progressOf(payload: HealthWorkoutPayload) {
  const done = payload.setsDone ?? 0;
  const total = payload.setsTotal ?? 0;
  return {
    upNext: payload.upNext ?? null,
    setsDone: done,
    setsTotal: total,
    setsLabel: liveActivityLabels.setsDone(done, total),
  };
}

/** The module, only when this phone can show Live Activities right now (EF-1). */
function liveActivity() {
  return WorkoutLiveActivity?.isSupported() ? WorkoutLiveActivity : null;
}

async function readLiveWorkoutState(): Promise<LiveWorkoutState | null> {
  const state = await WorkoutLiveActivity?.getState();
  if (!state) {
    return null;
  }

  return {
    workoutSessionId: state.workoutId,
    pausedAt: toIso(state.pausedAtMs),
    // The activity accumulates fractional seconds; the draft keeps whole ones.
    pausedSeconds: Math.floor(state.pausedSeconds),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * iOS Live Activity behind `LiveWorkoutBridge` (spec 0012). The activity is
 * keyed by `workoutSessionId`; starting one ends any other first.
 */
export const appleHealthLiveWorkoutBridge: LiveWorkoutBridge = {
  providerId: 'apple-health',
  async startLiveWorkout(payload: HealthWorkoutPayload) {
    await liveActivity()?.start({
      workoutId: payload.workoutSessionId,
      startedAtMs: Date.parse(payload.startedAt),
      routineName: payload.routineName ?? '',
      pausedAtMs: toMs(payload.pausedAt),
      pausedSeconds: payload.pausedSeconds ?? 0,
      activeKcal: toKcal(payload.activeEnergyKcal),
      restEndsAtMs: runningRestEndMs(payload.restEndsAt),
      ...progressOf(payload),
      pausedLabel: liveActivityLabels.paused,
      pauseLabel: liveActivityLabels.pause,
      resumeLabel: liveActivityLabels.resume,
      finishLabel: liveActivityLabels.finish,
      discardLabel: liveActivityLabels.discard,
      nextLabel: liveActivityLabels.next,
      allDoneLabel: liveActivityLabels.allDone,
    });
  },
  async updateLiveWorkout(payload: HealthWorkoutPayload) {
    const module = liveActivity();
    if (!module) {
      return;
    }

    await module.setPause(
      payload.workoutSessionId,
      toMs(payload.pausedAt),
      payload.pausedSeconds ?? 0,
    );
    await module.setKcal(payload.workoutSessionId, toKcal(payload.activeEnergyKcal));
    // Optional: a build from before spec 0018 has no rest on the activity.
    await module.setRest?.(payload.workoutSessionId, runningRestEndMs(payload.restEndsAt));
    // Optional: a build from before spec 0035 shows no progress.
    const progress = progressOf(payload);
    await module.setProgress?.(
      payload.workoutSessionId,
      progress.upNext,
      progress.setsDone,
      progress.setsTotal,
      progress.setsLabel,
    );
  },
  async finishLiveWorkout(_payload: HealthWorkoutPayload) {
    await WorkoutLiveActivity?.end();
  },
  getLiveWorkoutState: readLiveWorkoutState,
  onLiveWorkoutStateChange(listener) {
    // The event only says that something changed; read the full state.
    const subscription = WorkoutLiveActivity?.addListener('onStateChange', () => {
      void readLiveWorkoutState().then((state) => {
        if (state) {
          listener(state);
        }
      });
    });
    return () => subscription?.remove();
  },
};
