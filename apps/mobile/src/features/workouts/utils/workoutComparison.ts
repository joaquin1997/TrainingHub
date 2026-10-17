import type { WeightUnit, WorkoutSession, WorkoutSet } from '@workout/domain';

import { formatWeight, fromKg, roundWeight } from '@/lib/weight';

import { exerciseVolumeKg, summarizeSession } from './sessionStats';

/**
 * "Volume versus last time" on the post-workout summary (spec 0034 FR-24):
 * derived on the phone from the saved history (`GET /workouts`), never stored.
 * A mobile-only view model, not a contract (plan-b, Article 3).
 */
export type ComparisonDirection = 'up' | 'down' | 'same';

export interface VolumeComparison {
  /** Today's volume minus the earlier one, in kg (Article 4). */
  deltaKg: number;
  direction: ComparisonDirection;
  /** When the earlier workout started. */
  previousDate: string;
}

export interface WorkoutComparison {
  /** Against the previous saved workout of the same routine; null without one. */
  routine: VolumeComparison | null;
  /** Per exercise id, against that exercise's last earlier session (0013). */
  exercises: Record<string, VolumeComparison | null>;
}

type ComparisonSet = Pick<
  WorkoutSet,
  'reps' | 'weightKg' | 'durationSeconds' | 'distanceMeters' | 'restSeconds' | 'performed' | 'completedAt'
>;

/** The workout just finished, with each set's `performed` already resolved. */
export interface ComparedWorkout {
  routineId?: string;
  startedAt: string;
  exercises: { exerciseId: string; sets: ComparisonSet[] }[];
}

const time = (iso: string) => Date.parse(iso);

function compareVolumes(
  currentKg: number,
  previousKg: number,
  previousDate: string,
  unit: WeightUnit,
): VolumeComparison | null {
  // A previous volume of 0 (reps-only or timed work) has nothing to compare
  // with; never "0" or a percentage (FR-24) — plan-b assumption.
  if (previousKg <= 0) {
    return null;
  }

  const deltaKg = currentKg - previousKg;
  const shown = roundWeight(fromKg(Math.abs(deltaKg), unit));
  const direction: ComparisonDirection = shown === 0 ? 'same' : deltaKg > 0 ? 'up' : 'down';
  return { deltaKg, direction, previousDate };
}

/** Volume (kg) of every entry of one exercise in a workout, entries summed. */
function volumeOfExercise(
  exercises: { exerciseId: string; sets: ComparisonSet[] }[],
  exerciseId: string,
) {
  return exercises
    .filter((exercise) => exercise.exerciseId === exerciseId)
    .reduce((sum, exercise) => sum + exerciseVolumeKg(exercise), 0);
}

/**
 * Compares a finished workout with the saved history (FR-24):
 *
 * - **routine** — the most recent saved workout with the same routine that
 *   started strictly before this one (the just-saved copy of this workout has
 *   the same start and is never its own previous). No routine link → null.
 * - **per exercise** — the most recent earlier saved workout, of any routine,
 *   that contains the exercise.
 *
 * Cancelled sessions are not "saved workouts" and are skipped. `same` when the
 * difference rounds to 0 in the display unit.
 */
export function compareWithPrevious(
  current: ComparedWorkout,
  saved: WorkoutSession[],
  unit: WeightUnit,
): WorkoutComparison {
  const startedAt = time(current.startedAt);
  const earlier = saved
    .filter((session) => session.status !== 'cancelled' && time(session.startedAt) < startedAt)
    .sort((left, right) => time(right.startedAt) - time(left.startedAt));

  let routine: VolumeComparison | null = null;
  if (current.routineId) {
    const previous = earlier.find((session) => session.routineId === current.routineId);
    if (previous) {
      routine = compareVolumes(
        summarizeSession(current).volumeKg,
        summarizeSession(previous).volumeKg,
        previous.startedAt,
        unit,
      );
    }
  }

  const exercises: Record<string, VolumeComparison | null> = {};
  for (const { exerciseId } of current.exercises) {
    if (exerciseId in exercises) {
      continue;
    }
    const previous = earlier.find((session) =>
      session.exercises.some((exercise) => exercise.exerciseId === exerciseId),
    );
    exercises[exerciseId] = previous
      ? compareVolumes(
          volumeOfExercise(current.exercises, exerciseId),
          volumeOfExercise(previous.exercises, exerciseId),
          previous.startedAt,
          unit,
        )
      : null;
  }

  return { routine, exercises };
}

/**
 * Loads the history and compares (EF-5): any failure — offline, an older or
 * unreachable server, an unexpected payload — gives null, so the summary
 * shows without a comparison and without an error.
 */
export async function loadWorkoutComparison(
  current: ComparedWorkout,
  unit: WeightUnit,
  listWorkouts: () => Promise<WorkoutSession[]>,
): Promise<WorkoutComparison | null> {
  try {
    const saved = await listWorkouts();
    return Array.isArray(saved) ? compareWithPrevious(current, saved, unit) : null;
  } catch {
    return null;
  }
}

type Translate = (key: string, options?: Record<string, unknown>) => string;

/** "12 Oct" / "12 oct": the earlier workout's day, in the app's language. */
export function formatComparisonDate(iso: string, language: string) {
  return new Date(iso).toLocaleDateString(language, { day: 'numeric', month: 'short' });
}

/**
 * Words for a comparison: a sentence (screen readers), a caption that fits a
 * narrow tile, and a short chip label. Each carries the direction in words or
 * a sign, never in colour alone (FR-17).
 */
export function describeComparison(
  comparison: VolumeComparison,
  unit: WeightUnit,
  language: string,
  t: Translate,
) {
  const delta = formatWeight(Math.abs(comparison.deltaKg), unit);
  const date = formatComparisonDate(comparison.previousDate, language);

  switch (comparison.direction) {
    case 'up':
      return {
        sentence: t('workouts.comparison.up', { delta, date }),
        caption: t('workouts.comparison.captionUp', { delta, date }),
        short: t('workouts.comparison.chipUp', { delta }),
      };
    case 'down':
      return {
        sentence: t('workouts.comparison.down', { delta, date }),
        caption: t('workouts.comparison.captionDown', { delta, date }),
        short: t('workouts.comparison.chipDown', { delta }),
      };
    default:
      return {
        sentence: t('workouts.comparison.same', { date }),
        caption: t('workouts.comparison.same', { date }),
        short: t('workouts.comparison.chipSame'),
      };
  }
}
