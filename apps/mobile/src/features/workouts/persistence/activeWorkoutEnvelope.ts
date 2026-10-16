import type { WorkoutSessionDraft } from '@/features/workouts/state/workoutDraftStore';

/**
 * What is stored on the device for the active workout (spec 0010): the draft,
 * whose it is, and a format version. Bump the version when the draft's shape
 * changes incompatibly; older envelopes are then discarded (EF-1).
 */
export const ACTIVE_WORKOUT_ENVELOPE_VERSION = 1;

interface ActiveWorkoutEnvelope {
  v: typeof ACTIVE_WORKOUT_ENVELOPE_VERSION;
  ownerId: string;
  savedAt: string;
  draft: WorkoutSessionDraft;
}

export type PersistedActiveWorkout =
  | { kind: 'ok'; draft: WorkoutSessionDraft }
  | { kind: 'foreign' }
  | { kind: 'invalid' }
  | { kind: 'empty' };

export function serializeActiveWorkout(
  draft: WorkoutSessionDraft,
  ownerId: string,
  now: Date = new Date(),
): string {
  const envelope: ActiveWorkoutEnvelope = {
    v: ACTIVE_WORKOUT_ENVELOPE_VERSION,
    ownerId,
    savedAt: now.toISOString(),
    draft,
  };
  return JSON.stringify(envelope);
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** Enough of the draft's shape to render and save it without crashing. */
function looksLikeDraft(value: unknown): value is WorkoutSessionDraft {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.clientId === 'string' &&
    typeof value.routineId === 'string' &&
    typeof value.routineName === 'string' &&
    typeof value.startedAt === 'string' &&
    Array.isArray(value.exercises) &&
    value.exercises.every(
      (exercise) =>
        isRecord(exercise) &&
        typeof exercise.id === 'string' &&
        typeof exercise.exerciseId === 'string' &&
        Array.isArray(exercise.entries),
    )
  );
}

/** A stored running rest with a readable end and length (spec 0018). */
function looksLikeRest(value: unknown): boolean {
  return (
    isRecord(value) &&
    typeof value.endsAt === 'string' &&
    !Number.isNaN(new Date(value.endsAt).getTime()) &&
    typeof value.totalSeconds === 'number' &&
    typeof value.workoutExerciseId === 'string'
  );
}

/**
 * Reads a stored envelope for `ownerId`: `ok` with the draft, `foreign` when it
 * belongs to someone else (EF-2), `invalid` when unreadable or from another
 * format version (EF-1), `empty` when nothing is stored.
 */
export function parsePersistedActiveWorkout(
  raw: string | null,
  ownerId: string,
): PersistedActiveWorkout {
  if (!raw) {
    return { kind: 'empty' };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { kind: 'invalid' };
  }

  if (
    !isRecord(parsed) ||
    parsed.v !== ACTIVE_WORKOUT_ENVELOPE_VERSION ||
    typeof parsed.ownerId !== 'string' ||
    !looksLikeDraft(parsed.draft)
  ) {
    return { kind: 'invalid' };
  }

  if (parsed.ownerId !== ownerId) {
    return { kind: 'foreign' };
  }

  const draft = parsed.draft;

  // A malformed rest is dropped; the workout itself is kept.
  if (draft.rest !== undefined && !looksLikeRest(draft.rest)) {
    return { kind: 'ok', draft: { ...draft, rest: undefined } };
  }

  return { kind: 'ok', draft };
}
