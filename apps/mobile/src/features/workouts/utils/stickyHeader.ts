import type { WeightUnit } from '@workout/domain';

import { exerciseBlockLabels } from '@/features/routines/utils/exerciseBlockLabels';
import { runAt } from '@/features/routines/utils/supersetGroups';
import { currentSetToDo } from '@/features/workouts/restTimer/nextSetToDo';
import {
  effectiveSetValue,
  effectiveSideReps,
  type WorkoutExerciseDraft,
  type WorkoutSessionDraft,
  type WorkoutSetDraft,
} from '@/features/workouts/state/workoutDraftStore';
import { roundStatus, type RoundStatus } from '@/features/workouts/superset/rounds';
import { setNumberOf } from '@/features/workouts/utils/setNumber';
import { formatDuration } from '@/lib/format';
import {
  formatDistance,
  parseDistanceInput,
  parseDurationInput,
  trackingFields,
} from '@/lib/tracking';

/**
 * The target of the set to do, as typed or else as ghosted (its placeholders),
 * in the session's display unit. Only the exercise's tracked fields, and only
 * those with a value.
 */
export interface UpNextValues {
  weight?: string;
  reps?: string;
  repsLeft?: string;
  repsRight?: string;
  duration?: string;
  distance?: string;
}

export interface StickyUpNext {
  workoutExerciseId: string;
  workoutSetId: string;
  exerciseName: string;
  /** "1", "2B"… as the exercise's card shows it. */
  blockLabel: string;
  /** The set's number as its row shows it. */
  setNumber: number;
  isWarmup: boolean;
  values: UpNextValues;
}

export interface StickyHeaderModel {
  /** The set to do now (spec 0034 FR-20), or null once every set is done. */
  upNext: StickyUpNext | null;
  /** The round of the up-next set's superset; null outside a superset. */
  round: { current: number; total: number } | null;
}

function setValues(exercise: WorkoutExerciseDraft, set: WorkoutSetDraft): UpNextValues {
  const values: UpNextValues = {};
  const assign = (key: keyof UpNextValues, value: string) => {
    if (value !== '') {
      values[key] = value;
    }
  };

  for (const field of trackingFields(exercise.trackingType)) {
    switch (field) {
      case 'weight':
        assign('weight', effectiveSetValue(set.weightKg, set.weightPlaceholder));
        break;
      case 'reps':
        if (exercise.isUnilateral) {
          assign('repsLeft', effectiveSideReps(set, 'left'));
          assign('repsRight', effectiveSideReps(set, 'right'));
        } else {
          assign('reps', effectiveSetValue(set.reps, set.repsPlaceholder));
        }
        break;
      case 'duration':
        assign('duration', effectiveSetValue(set.duration ?? '', set.durationPlaceholder));
        break;
      case 'distance':
        assign('distance', effectiveSetValue(set.distance ?? '', set.distancePlaceholder));
        break;
    }
  }
  return values;
}

/**
 * What the compact workout header shows (spec 0034 FR-21): the set to do now —
 * the same set as the rest bar, the rest-over alert and the watch
 * (`currentSetToDo`) — and, when it sits in a superset, that superset's round.
 */
export function stickyHeaderModel(draft: WorkoutSessionDraft): StickyHeaderModel {
  const target = currentSetToDo(draft);
  const index = target
    ? draft.exercises.findIndex((exercise) => exercise.id === target.workoutExerciseId)
    : -1;
  const exercise = draft.exercises[index];
  const set = exercise?.entries.find((entry) => entry.id === target?.workoutSetId);
  if (!exercise || !set) {
    return { upNext: null, round: null };
  }

  const run = runAt(draft.exercises, index);
  const status: RoundStatus | null = run?.isSuperset
    ? roundStatus(draft.exercises.slice(run.start, run.end))
    : null;

  return {
    upNext: {
      workoutExerciseId: exercise.id,
      workoutSetId: set.id,
      exerciseName: exercise.exerciseName,
      blockLabel: exerciseBlockLabels(draft.exercises)[index]?.label ?? String(index + 1),
      setNumber: setNumberOf(exercise.entries, set.id)?.number ?? set.order,
      isWarmup: set.type === 'warmup',
      values: setValues(exercise, set),
    },
    round:
      status && status.current !== null
        ? { current: status.current, total: status.total }
        : null,
  };
}

/**
 * The target in a few characters, e.g. "60 kg × 8", "20 kg × 10/8",
 * "× 12", "500 m · 1:45"; null when the set has no value at all.
 */
export function upNextTargetLabel(values: UpNextValues, unit: WeightUnit): string | null {
  const reps =
    values.repsLeft !== undefined || values.repsRight !== undefined
      ? `${values.repsLeft ?? '–'}/${values.repsRight ?? '–'}`
      : values.reps;
  const load = [
    values.weight !== undefined ? `${values.weight} ${unit}` : null,
    reps !== undefined ? `× ${reps}` : null,
  ]
    .filter((part): part is string => part !== null)
    .join(' ');

  const meters = values.distance !== undefined ? parseDistanceInput(values.distance) : undefined;
  const seconds = values.duration !== undefined ? parseDurationInput(values.duration) : undefined;
  const parts = [
    typeof meters === 'number' ? formatDistance(meters) : values.distance,
    load === '' ? undefined : load,
    typeof seconds === 'number' ? formatDuration(seconds) : values.duration,
  ].filter((part): part is string => part !== undefined);

  return parts.length > 0 ? parts.join(' · ') : null;
}
