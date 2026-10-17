import { runAt } from '@/features/routines/utils/supersetGroups';
import { roundStatus, workingSets } from '@/features/workouts/superset/rounds';
import type {
  WorkoutExerciseDraft,
  WorkoutSessionDraft,
} from '@/features/workouts/state/workoutDraftStore';

export interface SetToDo {
  workoutExerciseId: string;
  workoutSetId: string;
}

function firstNotDone(exercise: WorkoutExerciseDraft): SetToDo | null {
  const set = exercise.entries.find((entry) => !entry.done);
  return set ? { workoutExerciseId: exercise.id, workoutSetId: set.id } : null;
}

/**
 * The next set of a superset in round order (spec 0029): warm-ups first,
 * exercise by exercise in listed order (FR-9); then the first listed exercise
 * with a set not done in the lowest unfinished round (FR-7).
 */
function nextInSuperset(members: ReadonlyArray<WorkoutExerciseDraft>): SetToDo | null {
  for (const member of members) {
    const warmUp = member.entries.find((set) => set.type === 'warmup' && !set.done);
    if (warmUp) {
      return { workoutExerciseId: member.id, workoutSetId: warmUp.id };
    }
  }

  const { current } = roundStatus(members);
  if (current === null) {
    return null;
  }
  for (const member of members) {
    const set = workingSets(member)[current - 1];
    if (set && !set.done) {
      return { workoutExerciseId: member.id, workoutSetId: set.id };
    }
  }
  return null;
}

/**
 * The set to do after one of `workoutExerciseId` (spec 0018 FR-5, spec 0029
 * FR-7). Inside a superset, round order; for an exercise alone, its first set
 * not done. With the block finished, the first set to do after it, then
 * before it; null when every set is done.
 */
export function nextSetToDo(
  draft: WorkoutSessionDraft,
  workoutExerciseId: string,
): SetToDo | null {
  const exercises = draft.exercises;
  const index = exercises.findIndex((exercise) => exercise.id === workoutExerciseId);
  const run = index === -1 ? null : runAt(exercises, index);
  const [start, end] = run ? [run.start, run.end] : [0, 0];

  const inBlock = run?.isSuperset
    ? nextInSuperset(exercises.slice(start, end))
    : run
      ? firstNotDone(exercises[start]!)
      : null;
  if (inBlock) {
    return inBlock;
  }

  for (const exercise of [...exercises.slice(end), ...exercises.slice(0, start)]) {
    const target = firstNotDone(exercise);
    if (target) {
      return target;
    }
  }
  return null;
}

/**
 * The set to do now, the same for the phone, the rest bar, the rest-over alert
 * and the watch (spec 0025 FR-4, spec 0029 FR-10, FR-11): the next set after
 * the last one ticked, else after the running rest's exercise, else the first
 * set left. Null when every set is done.
 */
export function currentSetToDo(draft: WorkoutSessionDraft): SetToDo | null {
  const anchor =
    draft.lastTickedExerciseId ??
    draft.rest?.workoutExerciseId ??
    draft.exercises.find((exercise) => exercise.entries.some((set) => !set.done))?.id;
  return anchor ? nextSetToDo(draft, anchor) : null;
}
