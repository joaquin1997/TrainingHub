import type { LiveRecordHit, RecordSetValues } from '@workout/domain';
// Runtime rules come through their own path: Metro cannot bundle the index.
import { sessionVolumeHit, setRecordHits } from '@workout/domain/records';

import {
  setValuesToSave,
  type WorkoutExerciseDraft,
  type WorkoutSessionDraft,
  type WorkoutSetDraft,
} from '@/features/workouts/state/workoutDraftStore';

import { startingRecordsFor } from './startingRecordsDraft';

/**
 * Record badges of the active workout (spec 0032), derived from the draft on
 * every render and never stored: whatever changes a set — marking, unmarking,
 * editing, retyping, deleting, replacing or removing its exercise, a new
 * tracking type — changes its badge with it (FR-15 – FR-19, EF-8), and a
 * discarded workout leaves nothing (FR-24).
 */
export interface LiveRecordBadges {
  /** By set id: the starting records the set beats, in display order. */
  bySet: Record<string, LiveRecordHit[]>;
  /** By exercise id: the running session volume beats the starting best (FR-14). */
  sessionVolumeByExercise: Record<string, LiveRecordHit>;
}

/** Only performed working sets are judged: marked done, not a warm-up (FR-5). */
function isJudged(set: WorkoutSetDraft): boolean {
  return set.done && set.type !== 'warmup';
}

/**
 * What the set would save (FR-6): typed values, else the ghosted placeholder;
 * only the fields its tracking type logs; weight in kg as saved, never the
 * rounded display figure (EF-7); both sides of a unilateral set.
 */
function savedValues(
  exercise: WorkoutExerciseDraft,
  set: WorkoutSetDraft,
  draft: WorkoutSessionDraft,
): RecordSetValues {
  return setValuesToSave(set, exercise.trackingType, draft.unit ?? 'kg', exercise.isUnilateral);
}

export function buildLiveRecordBadges(draft: WorkoutSessionDraft | null): LiveRecordBadges {
  const badges: LiveRecordBadges = { bySet: {}, sessionVolumeByExercise: {} };
  if (!draft) {
    return badges;
  }

  // Every entry of the same exercise adds to one session volume (FR-14).
  const judgedByExercise = new Map<string, RecordSetValues[]>();

  for (const exercise of draft.exercises) {
    // Not loaded: no badge at all, never one judged against missing data (EF-1).
    const starting = startingRecordsFor(draft, exercise.exerciseId);
    if (!starting) {
      continue;
    }

    const judged = judgedByExercise.get(exercise.exerciseId) ?? [];
    for (const set of exercise.entries) {
      if (!isJudged(set)) {
        continue;
      }

      const values = savedValues(exercise, set, draft);
      judged.push(values);
      // This set against the starting records only, never other sets (FR-12).
      const hits = setRecordHits(values, starting);
      if (hits.length > 0) {
        badges.bySet[set.id] = hits;
      }
    }
    judgedByExercise.set(exercise.exerciseId, judged);
  }

  for (const [exerciseId, sets] of judgedByExercise) {
    const hit = sessionVolumeHit(sets, startingRecordsFor(draft, exerciseId)!);
    if (hit) {
      badges.sessionVolumeByExercise[exerciseId] = hit;
    }
  }

  return badges;
}

export interface RecordNotice {
  workoutSetId: string;
  exerciseName: string;
  hits: LiveRecordHit[];
}

/**
 * The notice for a set just marked done that earned a badge (FR-20): a set
 * that was not done in `previous` and is done with a badge in `next`. Editing
 * a done set into a record, retyping it, or records arriving late (EF-2) give
 * no notice; neither does the first draft seen (`previous` null).
 */
export function recordNotice(
  previous: WorkoutSessionDraft | null,
  next: WorkoutSessionDraft | null,
  badges: LiveRecordBadges = buildLiveRecordBadges(next),
): RecordNotice | undefined {
  if (!previous || !next) {
    return undefined;
  }

  const wasDone = new Map<string, boolean>();
  for (const exercise of previous.exercises) {
    for (const set of exercise.entries) {
      wasDone.set(set.id, set.done);
    }
  }

  for (const exercise of next.exercises) {
    for (const set of exercise.entries) {
      const hits = badges.bySet[set.id];
      if (hits && set.done && wasDone.get(set.id) === false) {
        return { workoutSetId: set.id, exerciseName: exercise.exerciseName, hits };
      }
    }
  }

  return undefined;
}
