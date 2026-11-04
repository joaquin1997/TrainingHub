import { runAt } from '@/features/routines/utils/supersetGroups';
import {
  completeSet,
  resolveRestSeconds,
  restOriginOf,
  resolveSetRestSeconds,
  skipRest,
  startRest,
  toggleWorkoutSetDone,
  type WorkoutExerciseDraft,
  type WorkoutSessionDraft,
  type WorkoutSetDraft,
} from '@/features/workouts/state/workoutDraftStore';

/**
 * Rounds of a superset (spec 0029). Round n is the n-th working set of every
 * exercise in the superset that has one; warm-up sets sit outside rounds
 * (FR-1, FR-9). Everything is derived from set positions and done marks, so
 * adding, removing or moving sets recomputes it at once (FR-23).
 */

/** The sets that take part in rounds: every set not typed warm-up. */
export function workingSets(exercise: WorkoutExerciseDraft): WorkoutSetDraft[] {
  return exercise.entries.filter((set) => set.type !== 'warmup');
}

/** 0-based round of a set; -1 for a warm-up or a set not in the exercise. */
export function roundIndexOf(exercise: WorkoutExerciseDraft, workoutSetId: string): number {
  return workingSets(exercise).findIndex((set) => set.id === workoutSetId);
}

/** The exercises of the superset holding `index`, or null when it is not in one. */
export function supersetAround(
  exercises: ReadonlyArray<WorkoutExerciseDraft>,
  index: number,
): WorkoutExerciseDraft[] | null {
  const run = runAt(exercises, index);
  return run?.isSuperset ? exercises.slice(run.start, run.end) : null;
}

export interface RoundStatus {
  /** 1-based lowest round with a set not done; null once every round is done. */
  current: number | null;
  /** How many rounds the superset has: its longest list of working sets. */
  total: number;
}

/** Where a superset stands, e.g. round 2 of 4, or complete (FR-13). */
export function roundStatus(members: ReadonlyArray<WorkoutExerciseDraft>): RoundStatus {
  const lists = members.map(workingSets);
  const total = lists.reduce((max, sets) => Math.max(max, sets.length), 0);

  for (let round = 0; round < total; round += 1) {
    if (lists.some((sets) => sets[round] !== undefined && !sets[round]!.done)) {
      return { current: round + 1, total };
    }
  }
  return { current: null, total };
}

/** The exercise whose rest follows a round: the last listed with a set in it (FR-3). */
export function restOwner(
  members: ReadonlyArray<WorkoutExerciseDraft>,
  round: number,
): WorkoutExerciseDraft | undefined {
  const withSet = members.filter((member) => workingSets(member)[round] !== undefined);
  return withSet[withSet.length - 1];
}

type TickPlan =
  | { kind: 'single'; exercise: WorkoutExerciseDraft }
  | { kind: 'round'; owner: WorkoutExerciseDraft; completes: boolean };

/** How ticking a not-done set plays out, or null when the set is not there. */
function planTick(
  draft: WorkoutSessionDraft,
  workoutExerciseId: string,
  workoutSetId: string,
): TickPlan | null {
  const index = draft.exercises.findIndex((item) => item.id === workoutExerciseId);
  const exercise = draft.exercises[index];
  if (!exercise || !exercise.entries.some((set) => set.id === workoutSetId)) {
    return null;
  }

  const members = supersetAround(draft.exercises, index);
  const round = roundIndexOf(exercise, workoutSetId);
  if (!members || round === -1) {
    return { kind: 'single', exercise };
  }

  // A later round never completes an earlier one: only this round counts (EF-2).
  const completes = members.every((member) => {
    const set = workingSets(member)[round];
    return set === undefined || set.id === workoutSetId || set.done;
  });
  return { kind: 'round', owner: restOwner(members, round) ?? exercise, completes };
}

/**
 * Seconds of rest that ticking this set would start: the exercise's own rest
 * outside a superset and for a warm-up (FR-6, FR-9), capped for a warm-up
 * (spec 0040 FR-8); inside a round, none
 * unless the tick completes the round, then the rest of the round's last
 * exercise (FR-2, FR-3). 0 means no rest.
 */
export function restAfterTick(
  draft: WorkoutSessionDraft,
  workoutExerciseId: string,
  workoutSetId: string,
  defaultRestSeconds: number,
): number {
  const plan = planTick(draft, workoutExerciseId, workoutSetId);
  if (!plan) {
    return 0;
  }
  if (plan.kind === 'single') {
    const set = plan.exercise.entries.find((item) => item.id === workoutSetId);
    return set ? resolveSetRestSeconds(plan.exercise, set, defaultRestSeconds) : 0;
  }
  return plan.completes ? resolveRestSeconds(plan.owner, defaultRestSeconds) : 0;
}

/**
 * Ticks a set done with the superset rules — the one rule for the phone and
 * the watch (FR-11):
 * - outside a superset, or a warm-up: exactly `completeSet` (FR-6, FR-9);
 * - a tick that completes its round starts the rest of the round's last
 *   exercise (FR-2, FR-3; none when that rest is off, EF-1);
 * - a tick that does not ends a running rest quietly (FR-4).
 * The ticked exercise is remembered as the anchor of "next set" (FR-7). A set
 * already done, or not found, leaves the workout as it is.
 */
export function completeSetInRounds(
  draft: WorkoutSessionDraft,
  workoutExerciseId: string,
  workoutSetId: string,
  defaultRestSeconds: number,
  now: Date = new Date(),
  restId?: string,
): WorkoutSessionDraft {
  const set = draft.exercises
    .find((item) => item.id === workoutExerciseId)
    ?.entries.find((item) => item.id === workoutSetId);
  const plan = planTick(draft, workoutExerciseId, workoutSetId);
  if (!plan || !set || set.done) {
    return draft;
  }

  let next: WorkoutSessionDraft;
  if (plan.kind === 'single') {
    next = completeSet(draft, workoutExerciseId, workoutSetId, defaultRestSeconds, now);
  } else if (plan.completes) {
    const rest = resolveRestSeconds(plan.owner, defaultRestSeconds);
    const completed = toggleWorkoutSetDone(draft, workoutExerciseId, workoutSetId, rest);
    next = startRest(
      completed,
      plan.owner.id,
      rest,
      now,
      restOriginOf(completed, workoutExerciseId, workoutSetId),
    );
  } else {
    // The person has moved on within the round: no rest, and none running.
    next = skipRest(toggleWorkoutSetDone(draft, workoutExerciseId, workoutSetId, 0));
  }

  if (restId && next.rest && next.rest !== draft.rest) next = { ...next, rest: { ...next.rest, id: restId } };
  return { ...next, lastTickedExerciseId: workoutExerciseId };
}
