import { isWarmUpPreferences } from '@/lib/warmUpContext';
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

  let draft = parsed.draft;
  if (draft.warmUpPreferences) {
    const entries = typeof draft.warmUpPreferences === 'object'
      ? Object.entries(draft.warmUpPreferences).filter(([, entry]) => entry && isWarmUpPreferences(entry.value) && typeof entry.pending === 'boolean')
      : [];
    draft = { ...draft, warmUpPreferences: Object.fromEntries(entries) };
  }
  // Optional metadata is untrusted in an older/tampered envelope. Retain the
  // workout but discard invalid context before the pure normalizer reads it.
  draft = { ...draft, exercises: draft.exercises.map((exercise) => {
    const m = exercise.warmUpMetadata;
    if (!m) return exercise;
    const strings = (v: unknown) => v === undefined || (Array.isArray(v) && v.every((x) => typeof x === 'string'));
    const valid = typeof m === 'object' && !Array.isArray(m) &&
      (m.name === undefined || typeof m.name === 'string') &&
      (m.category === undefined || typeof m.category === 'string') &&
      (m.loadingKind === undefined || ['barbell', 'dumbbell', 'machine'].includes(m.loadingKind)) &&
      strings(m.aliases) && strings(m.equipment) && strings(m.primaryMuscleGroups);
    return valid ? exercise : { ...exercise, warmUpMetadata: undefined };
  }) };

  // Optional interaction metadata never makes an otherwise valid draft unreadable.
  const validId = (value: unknown): value is string => typeof value === 'string' && value.length > 0;
  const selection = draft.undoSelection;
  const selectedExercise = isRecord(selection) && validId(selection.workoutExerciseId)
    ? draft.exercises.find((exercise) => exercise.id === selection.workoutExerciseId) : undefined;
  const selectedSet = isRecord(selection) && validId(selection.workoutSetId)
    ? selectedExercise?.entries.find((set) => set.id === selection.workoutSetId) : undefined;
  if (selection !== undefined && (!selectedSet || selectedSet.done)) {
    draft = { ...draft, undoSelection: undefined };
  }
  draft = { ...draft, exercises: draft.exercises.map((exercise) => ({
    ...exercise,
    entries: exercise.entries.map((set) => validId(set.completionId) || set.completionId === undefined
      ? set : { ...set, completionId: undefined }),
  })) };

  // A malformed rest is dropped; the workout itself is kept.
  if (draft.rest !== undefined && !looksLikeRest(draft.rest)) {
    return { kind: 'ok', draft: { ...draft, rest: undefined } };
  }

  if (draft.rest) {
    const rest = { ...draft.rest };
    if (!validId(rest.id)) delete rest.id;
    const origin = validId(rest.originExerciseId) && validId(rest.originSetId) && validId(rest.originCompletionId);
    if (!origin) {
      delete rest.originExerciseId;
      delete rest.originSetId;
      delete rest.originCompletionId;
    }
    draft = { ...draft, rest };
  }

  return { kind: 'ok', draft };
}
