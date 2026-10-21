import type {
  WatchWorkoutEvent,
  WatchWorkoutOutcome,
  WatchWorkoutSnapshot,
} from '@workout/domain';

/**
 * The JSON exchanged with the TrainingHub watch app (spec 0025). The watch
 * app's `Codable` types in `targets/watch/WatchWire.swift` mirror it; a test
 * checks that every key here exists there. Instants are epoch milliseconds.
 */
export const WATCH_WIRE_VERSION = 1;

/** Texts the watch shows, in the phone's language. */
export interface WatchLabels {
  done: string;
  pause: string;
  resume: string;
  finish: string;
  rest: string;
  paused: string;
  finishOnPhone: string;
  allDone: string;
  waiting: string;
  /** "Set 2 of 4", or "Warm-up 1 of 3" (spec 0040). */
  setOf: (number: number, count: number, isWarmup: boolean) => string;
  /** Spec 0035: the secondary menu and the discard confirmation. */
  more: string;
  discard: string;
  discardTitle: string;
  cancel: string;
  connectToDiscard: string;
  /** Spec 0041: the unit under the watch's reps control. */
  reps: string;
  /** "3 sets done will be lost." / "No sets done yet." */
  discardLost: (count: number) => string;
}

export interface WatchContextWire {
  v: number;
  status: 'active' | WatchWorkoutOutcome;
  workoutId: string;
  sentAtMs: number;
  routineName?: string;
  startedAtMs?: number;
  pausedAtMs?: number;
  pausedSeconds?: number;
  restEndsAtMs?: number;
  currentSet?: {
    exerciseId: string;
    setId: string;
    exerciseName: string;
    setTitle: string;
    target: string;
    restSeconds: number;
    /** Spec 0041: the reps control's start and the values beside it. */
    reps?: number;
    load?: string;
  };
  /** Sets done, and the confirmation's message naming them (spec 0035). */
  setsDone?: number;
  discardMessage?: string;
  labels?: Omit<WatchLabels, 'setOf' | 'discardLost'>;
}

const ms = (iso?: string) => (iso ? Date.parse(iso) : undefined);

/** The application context for a workout in progress. */
export function encodeActiveContext(
  snapshot: WatchWorkoutSnapshot,
  labels: WatchLabels,
  now: number = Date.now(),
): string {
  const { setOf, discardLost, ...texts } = labels;
  const setsDone = snapshot.setsDone ?? 0;
  const set = snapshot.currentSet;
  const wire: WatchContextWire = {
    v: WATCH_WIRE_VERSION,
    status: 'active',
    workoutId: snapshot.workoutSessionId,
    sentAtMs: now,
    routineName: snapshot.routineName,
    startedAtMs: ms(snapshot.startedAt),
    pausedAtMs: ms(snapshot.pausedAt),
    pausedSeconds: snapshot.pausedSeconds,
    restEndsAtMs: ms(snapshot.restEndsAt),
    currentSet: set
      ? {
          exerciseId: set.workoutExerciseId,
          setId: set.workoutSetId,
          exerciseName: set.exerciseName,
          setTitle: setOf(set.setNumber, set.setCount, set.isWarmup ?? false),
          target: set.target,
          restSeconds: set.restSeconds,
          ...(set.reps !== undefined ? { reps: set.reps, load: set.load ?? '' } : {}),
        }
      : undefined,
    setsDone,
    discardMessage: discardLost(setsDone),
    labels: texts,
  };
  return JSON.stringify(wire);
}

/** The application context that ends the workout on the watch. */
export function encodeEndContext(
  workoutId: string,
  outcome: WatchWorkoutOutcome,
  now: number = Date.now(),
): string {
  const wire: WatchContextWire = { v: WATCH_WIRE_VERSION, status: outcome, workoutId, sentAtMs: now };
  return JSON.stringify(wire);
}

/** Requests the watch queues (user info `event`). */
export interface WatchEventWire {
  v: number;
  id: string;
  kind: 'setDone' | 'pause' | 'resume' | 'finishRequested' | 'discardRequested';
  workoutId: string;
  exerciseId?: string;
  setId?: string;
  atMs?: number;
  /** Spec 0041: reps chosen on the watch. */
  reps?: number;
}

/** The watch's latest measurement (its application context `metrics`). */
export interface WatchMetricsWire {
  v: number;
  workoutId: string;
  kcal: number;
}

const isString = (value: unknown): value is string => typeof value === 'string' && value !== '';
const isNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

/** Reads a message from the watch; anything malformed or unknown is null. */
export function decodeWatchMessage(kind: string, json: string): WatchWorkoutEvent | null {
  let raw: Record<string, unknown>;
  try {
    const parsed: unknown = JSON.parse(json);
    if (typeof parsed !== 'object' || parsed === null) {
      return null;
    }
    raw = parsed as Record<string, unknown>;
  } catch {
    return null;
  }

  const workoutSessionId = raw.workoutId;
  if (!isString(workoutSessionId)) {
    return null;
  }

  if (kind === 'metrics') {
    return isNumber(raw.kcal) && raw.kcal >= 0
      ? { kind: 'activeEnergy', workoutSessionId, kcal: raw.kcal }
      : null;
  }

  if (kind !== 'event' || !isString(raw.id)) {
    return null;
  }
  const id = raw.id;
  const at = isNumber(raw.atMs) ? new Date(raw.atMs).toISOString() : null;

  switch (raw.kind) {
    case 'setDone':
      return isString(raw.exerciseId) && isString(raw.setId) && at
        ? {
            kind: 'setDone',
            id,
            workoutSessionId,
            workoutExerciseId: raw.exerciseId,
            workoutSetId: raw.setId,
            at,
            // Spec 0041: whole reps between 0 and 100; anything else is ignored.
            ...(isNumber(raw.reps) && raw.reps >= 0 && raw.reps <= 100
              ? { reps: Math.round(raw.reps) }
              : {}),
          }
        : null;
    case 'pause':
    case 'resume':
      return at ? { kind: raw.kind, id, workoutSessionId, at } : null;
    case 'finishRequested':
    case 'discardRequested':
      return { kind: raw.kind, id, workoutSessionId };
    default:
      return null;
  }
}
