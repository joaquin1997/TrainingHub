import type { RoutineWarmUpItem, RoutineWarmUpItemInput } from '@workout/domain';

import { formatDuration } from '@/lib/format';
import { parseDurationInput } from '@/lib/tracking';

/** One warm-up block item as typed in the routine editor (spec 0024). */
export type EditableWarmUpItem = {
  id: string;
  name: string;
  /** Seconds or m:ss for a time target; a whole number for reps. */
  target: string;
  targetKind: 'time' | 'reps';
};

type Targets = { targetDurationSeconds?: number; targetReps?: number };

/** A target for display: "5:00" for a time, "× 15" for reps, '' for none. */
export function formatWarmUpTarget(item: Targets): string {
  if (item.targetDurationSeconds !== undefined) {
    return formatDuration(item.targetDurationSeconds);
  }
  if (item.targetReps !== undefined) {
    return `× ${item.targetReps}`;
  }
  return '';
}

export function toEditableWarmUpItems(
  items: readonly RoutineWarmUpItem[] | undefined,
  createId: () => string,
): EditableWarmUpItem[] {
  return (items ?? [])
    .slice()
    .sort((left, right) => left.order - right.order)
    .map((item) => ({
      id: createId(),
      name: item.name,
      target:
        item.targetDurationSeconds !== undefined
          ? formatDuration(item.targetDurationSeconds)
          : item.targetReps !== undefined
            ? String(item.targetReps)
            : '',
      targetKind: item.targetReps !== undefined ? 'reps' : 'time',
    }));
}

/**
 * The block to save, in order. Rows without a name are dropped; a target
 * that does not read as a time or a whole rep count makes the block invalid
 * (null), so the editor can say so instead of silently losing it.
 */
export function toWarmUpItemsInput(
  rows: readonly EditableWarmUpItem[],
): RoutineWarmUpItemInput[] | null {
  const items: RoutineWarmUpItemInput[] = [];

  for (const row of rows) {
    const name = row.name.trim();
    if (!name) {
      continue;
    }

    const target = row.target.trim();
    if (!target) {
      items.push({ name });
      continue;
    }

    if (row.targetKind === 'time') {
      const seconds = parseDurationInput(target);
      if (typeof seconds !== 'number') {
        return null;
      }
      items.push({ name, targetDurationSeconds: seconds });
    } else {
      if (!/^\d+$/.test(target)) {
        return null;
      }
      items.push({ name, targetReps: Number(target) });
    }
  }

  return items;
}
