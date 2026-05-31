import type { Routine } from '@workout/domain';

export interface RoutineFolderGroup {
  /** Undefined for routines without a folder (sorted last). */
  folder?: string;
  routines: Routine[];
}

// Sorts the "no folder" bucket after named folders.
const UNFILED_KEY = '￿';

/**
 * Groups routines by their folder label, folders alphabetical and the unfiled
 * bucket last. Routine order within a group is preserved.
 */
export function groupRoutinesByFolder(routines: Routine[]): RoutineFolderGroup[] {
  const groups = new Map<string, Routine[]>();

  for (const routine of routines) {
    const key = routine.folder?.trim() ? routine.folder.trim() : UNFILED_KEY;
    const bucket = groups.get(key);
    if (bucket) {
      bucket.push(routine);
    } else {
      groups.set(key, [routine]);
    }
  }

  return [...groups.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, grouped]) => ({
      folder: key === UNFILED_KEY ? undefined : key,
      routines: grouped,
    }));
}
