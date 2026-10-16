import { requireOptionalNativeModule } from 'expo';

export type StartActivityPayload = {
  workoutId: string;
  startedAtMs: number;
  routineName: string;
  pausedAtMs: number | null;
  pausedSeconds: number;
  activeKcal: number | null;
  pausedLabel: string;
  pauseLabel: string;
  resumeLabel: string;
  finishLabel: string;
};

export type ActivityState = {
  workoutId: string;
  startedAtMs: number;
  pausedAtMs: number | null;
  pausedSeconds: number;
  activeKcal: number | null;
};

export type ActivityStateChange = {
  workoutId: string;
  paused: boolean;
  atMs: number;
};

type WorkoutLiveActivityNative = {
  isSupported(): boolean;
  start(payload: StartActivityPayload): Promise<void>;
  setPause(
    workoutId: string,
    pausedAtMs: number | null,
    pausedSeconds: number,
  ): Promise<void>;
  setKcal(workoutId: string, kcal: number | null): Promise<void>;
  end(): Promise<void>;
  getState(): Promise<ActivityState | null>;
  addListener(
    event: 'onStateChange',
    listener: (change: ActivityStateChange) => void,
  ): { remove(): void };
};

/** Null on platforms without the native module (Android, web, Expo Go). */
export const WorkoutLiveActivity =
  requireOptionalNativeModule<WorkoutLiveActivityNative>('WorkoutLiveActivity');
