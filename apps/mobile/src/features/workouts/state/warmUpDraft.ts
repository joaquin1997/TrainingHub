import type { Routine, WorkoutWarmUpItemInput } from '@workout/domain';

// Types only: the store imports this module's functions at runtime.
import type { WarmUpItemDraft, WorkoutSessionDraft } from './workoutDraftStore';

/**
 * The routine's warm-up block as the workout's checklist (spec 0024),
 * copied at start so editing the routine never changes this workout.
 * Absent when the routine has none.
 */
export function buildWarmUpDraft(routine: Routine): WarmUpItemDraft[] | undefined {
  const items = (routine.warmUpItems ?? [])
    .slice()
    .sort((left, right) => left.order - right.order)
    .map((item) => ({
      id: `warm-up-${routine.id}-${item.order}`,
      name: item.name,
      targetDurationSeconds: item.targetDurationSeconds,
      targetReps: item.targetReps,
      done: false,
    }));

  return items.length > 0 ? items : undefined;
}

/**
 * Ticks or unticks one warm-up item. Nothing else changes: no rest starts,
 * no set is touched, and the sets-done count ignores the block (FR-6).
 */
export function toggleWarmUpItem(
  workoutDraft: WorkoutSessionDraft,
  itemId: string,
): WorkoutSessionDraft {
  if (!workoutDraft.warmUp?.some((item) => item.id === itemId)) {
    return workoutDraft;
  }

  return {
    ...workoutDraft,
    warmUp: workoutDraft.warmUp.map((item) =>
      item.id === itemId ? { ...item, done: !item.done } : item,
    ),
  };
}

/** Every item with whether it was done, for the save (FR-7). */
export function toWarmUpItemsInput(
  workoutDraft: WorkoutSessionDraft,
): WorkoutWarmUpItemInput[] | undefined {
  if (!workoutDraft.warmUp?.length) {
    return undefined;
  }

  return workoutDraft.warmUp.map(({ name, targetDurationSeconds, targetReps, done }) => ({
    name,
    targetDurationSeconds,
    targetReps,
    done,
  }));
}
