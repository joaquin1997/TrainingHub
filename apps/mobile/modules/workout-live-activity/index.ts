import { requireOptionalNativeModule } from 'expo';

export type StartActivityPayload = {
  workoutId: string;
  startedAtMs: number;
  routineName: string;
  pausedAtMs: number | null;
  pausedSeconds: number;
  activeKcal: number | null;
  /** End of the running rest (spec 0018); ignored by builds before it. */
  restEndsAtMs?: number | null;
  /** Spec 0035; ignored by builds before it. */
  upNext?: string | null;
  setsDone?: number;
  setsTotal?: number;
  setsLabel?: string;
  pausedLabel: string;
  pauseLabel: string;
  resumeLabel: string;
  finishLabel: string;
  discardLabel?: string;
  nextLabel?: string;
  allDoneLabel?: string;
};

export type ActivityState = {
  workoutId: string;
  startedAtMs: number;
  pausedAtMs: number | null;
  pausedSeconds: number;
  activeKcal: number | null;
};

export type ActivityUpdate = {
  pausedAtMs: number | null;
  pausedSeconds: number;
  activeKcal: number | null;
  restEndsAtMs: number | null;
  upNext: string | null;
  setsDone: number;
  setsTotal: number;
  setsLabel: string;
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
  /** The running rest's end, or null (spec 0018). Absent in builds before it. */
  setRest?(workoutId: string, restEndsAtMs: number | null): Promise<void>;
  /** Up-next set and sets done (spec 0035). Absent in builds before it. */
  setProgress?(
    workoutId: string,
    upNext: string | null,
    setsDone: number,
    setsTotal: number,
    setsLabel: string,
  ): Promise<void>;
  /**
   * Every field of the activity in one update (spec 0045). The separate
   * setters above each read the activity back first, and right after an
   * update that reading can still be the previous one, so a later setter
   * dropped the rest. Absent in builds before it.
   */
  update?(workoutId: string, state: ActivityUpdate): Promise<void>;
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
