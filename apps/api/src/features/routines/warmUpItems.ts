import type { RoutineWarmUpItemInput } from '@workout/domain';

/**
 * Body parsing for warm-up block items (spec 0024), shared by routines
 * (template) and workouts (performed). Only the parsing is shared; each side
 * has its own type and table (Article 2).
 */
export const MAX_WARM_UP_ITEMS = 20;
export const MAX_WARM_UP_ITEM_NAME_LENGTH = 80;

type WarmUpItemFields = RoutineWarmUpItemInput;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Absent stays absent; otherwise a whole number ≥ 0, or invalid (null). */
function parseOptionalCount(value: unknown): number | undefined | null {
  if (value === undefined || value === null) {
    return undefined;
  }

  return typeof value === 'number' && Number.isInteger(value) && value >= 0 ? value : null;
}

/** An item's name and targets, or null when any of them is malformed. */
export function parseWarmUpItemFields(value: unknown): WarmUpItemFields | null {
  if (!isRecord(value) || typeof value.name !== 'string') {
    return null;
  }

  const name = value.name.trim();
  const targetDurationSeconds = parseOptionalCount(value.targetDurationSeconds);
  const targetReps = parseOptionalCount(value.targetReps);

  if (
    !name ||
    name.length > MAX_WARM_UP_ITEM_NAME_LENGTH ||
    targetDurationSeconds === null ||
    targetReps === null
  ) {
    return null;
  }

  return { name, targetDurationSeconds, targetReps };
}

/**
 * A `warmUpItems` body field: `undefined` when absent, the parsed items in
 * order, or `null` when it is not a list of at most
 * {@link MAX_WARM_UP_ITEMS} valid items.
 */
export function parseWarmUpItemsField<T>(
  value: unknown,
  parseItem: (item: unknown) => T | null,
): T[] | undefined | null {
  if (value === undefined) {
    return undefined;
  }

  if (!Array.isArray(value) || value.length > MAX_WARM_UP_ITEMS) {
    return null;
  }

  const items = value.map(parseItem);
  return items.every((item): item is T => item !== null) ? items : null;
}
