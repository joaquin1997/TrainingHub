/**
 * Superset grouping as an operation on an ordered list (spec 0029). Works on
 * any list whose items carry an optional `supersetGroup` — the routine
 * editor's rows and the active workout's exercises — and never mutates it.
 *
 * A superset is a run of two or more adjacent items with the same number, as
 * `exerciseBlockLabels` draws it; a number on an item alone, or repeated on
 * items that are not next to each other, is not joined (EF-4).
 */
type Grouped = { supersetGroup?: number };

export interface SupersetRun {
  /** Index of the first item of the run. */
  start: number;
  /** Index after the last item of the run. */
  end: number;
  /** Two or more items: a superset. One item: a normal exercise. */
  isSuperset: boolean;
}

/** The blocks of the list in order: each superset, and each item alone. */
export function supersetRuns(items: ReadonlyArray<Grouped>): SupersetRun[] {
  const runs: SupersetRun[] = [];
  let index = 0;

  while (index < items.length) {
    const group = items[index]?.supersetGroup;
    let end = index + 1;
    if (group !== undefined) {
      while (end < items.length && items[end]?.supersetGroup === group) {
        end += 1;
      }
    }
    runs.push({ start: index, end, isSuperset: end - index >= 2 });
    index = end;
  }

  return runs;
}

/** The run holding `index`, or null when the index is out of the list. */
export function runAt(items: ReadonlyArray<Grouped>, index: number): SupersetRun | null {
  return supersetRuns(items).find((run) => index >= run.start && index < run.end) ?? null;
}

function withGroup<T extends Grouped>(item: T, group: number | undefined): T {
  if (item.supersetGroup === group) {
    return item;
  }
  const next = { ...item };
  if (group === undefined) {
    delete next.supersetGroup;
  } else {
    next.supersetGroup = group;
  }
  return next;
}

/**
 * Numbers each superset 1, 2, 3… in order and clears the number of every item
 * alone, keeping the shape exactly as drawn. Items whose number does not change
 * are returned as they are.
 */
export function normalizeSupersetGroups<T extends Grouped>(items: ReadonlyArray<T>): T[] {
  const result: T[] = [];
  let supersets = 0;

  for (const run of supersetRuns(items)) {
    const group = run.isSuperset ? (supersets += 1) : undefined;
    for (let index = run.start; index < run.end; index += 1) {
      result.push(withGroup(items[index]!, group));
    }
  }

  return result;
}

/** A number no item in the list uses. */
function freshGroup(items: ReadonlyArray<Grouped>): number {
  return items.reduce((max, item) => Math.max(max, item.supersetGroup ?? 0), 0) + 1;
}

/**
 * Moves one item a step up or down, superset-aware (FR-18 to FR-20):
 * - inside a superset it swaps with its neighbour in the superset;
 * - the first item moving up, or the last moving down, leaves the superset
 *   where it stands — a superset left with one item is a normal exercise;
 * - an item alone jumps over the whole neighbouring block, and never joins it.
 */
export function moveInGroups<T extends Grouped>(
  items: ReadonlyArray<T>,
  index: number,
  direction: 'up' | 'down',
): T[] {
  const list = normalizeSupersetGroups(items);
  const runs = supersetRuns(list);
  const runIndex = runs.findIndex((run) => index >= run.start && index < run.end);
  const run = runs[runIndex];
  if (!run) {
    return list;
  }

  if (run.isSuperset) {
    const atEdge = direction === 'up' ? index === run.start : index === run.end - 1;
    if (atEdge) {
      const next = list.slice();
      next[index] = withGroup(list[index]!, undefined);
      return normalizeSupersetGroups(next);
    }
    const target = direction === 'up' ? index - 1 : index + 1;
    const next = list.slice();
    next[index] = list[target]!;
    next[target] = list[index]!;
    return next;
  }

  const neighbour = runs[direction === 'up' ? runIndex - 1 : runIndex + 1];
  if (!neighbour) {
    return list;
  }
  const item = list[index]!;
  const without = [...list.slice(0, index), ...list.slice(index + 1)];
  const insertAt = direction === 'up' ? neighbour.start : neighbour.end - 1;
  return [...without.slice(0, insertAt), item, ...without.slice(insertAt)];
}

/**
 * Joins the item with the one below it (FR-16). Joining to an item already in
 * a superset adds to that superset; two supersets meeting become one.
 */
export function joinWithNext<T extends Grouped>(items: ReadonlyArray<T>, index: number): T[] {
  const list = normalizeSupersetGroups(items);
  if (index < 0 || index >= list.length - 1) {
    return list;
  }

  const upper = runAt(list, index)!;
  const lower = runAt(list, index + 1)!;
  const group = freshGroup(list);
  const next = list.map((item, position) =>
    position >= upper.start && position < lower.end ? withGroup(item, group) : item,
  );
  return normalizeSupersetGroups(next);
}

/**
 * Takes the item out of its superset (FR-16, FR-17). The first or last item
 * leaves where it stands; one in the middle moves to just after the superset,
 * so the others stay one superset. A superset left with one item is a normal
 * exercise.
 */
export function leaveSuperset<T extends Grouped>(items: ReadonlyArray<T>, index: number): T[] {
  const list = normalizeSupersetGroups(items);
  const run = runAt(list, index);
  if (!run || !run.isSuperset) {
    return list;
  }

  const item = withGroup(list[index]!, undefined);
  if (index === run.start || index === run.end - 1) {
    const next = list.slice();
    next[index] = item;
    return normalizeSupersetGroups(next);
  }

  const without = [...list.slice(0, index), ...list.slice(index + 1)];
  const insertAt = run.end - 1;
  return normalizeSupersetGroups([
    ...without.slice(0, insertAt),
    item,
    ...without.slice(insertAt),
  ]);
}

/**
 * Removes the item; the rest of its superset stays joined (FR-21), and two
 * blocks that become neighbours never merge.
 */
export function removeKeepingGroups<T extends Grouped>(
  items: ReadonlyArray<T>,
  index: number,
): T[] {
  const list = normalizeSupersetGroups(items);
  if (index < 0 || index >= list.length) {
    return list;
  }
  return normalizeSupersetGroups([...list.slice(0, index), ...list.slice(index + 1)]);
}

export type SupersetKind = 'superset' | 'triset' | 'giantset';

/** "Superset" for two, "Tri-set" for three, "Giant set" for four or more (FR-12). */
export function supersetKind(size: number): SupersetKind {
  if (size >= 4) {
    return 'giantset';
  }
  return size === 3 ? 'triset' : 'superset';
}
