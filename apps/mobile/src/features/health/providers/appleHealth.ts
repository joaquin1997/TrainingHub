import type {
  HealthIntegration,
  HealthWorkoutPayload,
  LiveWorkoutBridge,
  LiveWorkoutState,
} from '@workout/domain';

import { WorkoutLiveActivity } from '../../../../modules/workout-live-activity';

export const appleHealthIntegration: HealthIntegration = {
  providerId: 'apple-health',
  displayName: 'Apple Health',
  async isAvailable() {
    // TODO: Replace placeholder availability check with native Apple Health capability detection.
    return true;
  },
  async requestPermissions() {
    // TODO: Replace placeholder permission request with native Apple Health authorization flow.
    return false;
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
