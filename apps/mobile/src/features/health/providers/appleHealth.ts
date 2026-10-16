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
}

let liveActivityLabels: LiveActivityLabels = {
  paused: 'Paused',
  pause: 'Pause',
  resume: 'Resume',
  finish: 'Finish',
};

export function setLiveActivityLabels(labels: LiveActivityLabels) {
  liveActivityLabels = labels;
}

const toMs = (iso?: string) => (iso ? Date.parse(iso) : null);
const toIso = (ms: number | null | undefined) =>
  ms == null ? undefined : new Date(ms).toISOString();
const toKcal = (kcal: number | null | undefined) =>
  kcal == null ? null : Math.round(kcal);

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
      restEndsAtMs: toMs(payload.restEndsAt),
      pausedLabel: liveActivityLabels.paused,
      pauseLabel: liveActivityLabels.pause,
      resumeLabel: liveActivityLabels.resume,
      finishLabel: liveActivityLabels.finish,
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
    await module.setRest?.(payload.workoutSessionId, toMs(payload.restEndsAt));
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
