import type { Routine, WorkoutSession } from '@workout/domain';

import { groupRoutinesByFolder } from './groupRoutinesByFolder';

/**
 * Today's routine (spec 0035 FR-6): the routine after the most recently
 * performed one, in the Routines list's order within its folder (unfiled
 * routines form their own group), wrapping round. When no saved workout points
 * at an existing routine, the first routine of the list; null with no routines.
 * `sessions` are newest first, as the API lists them.
 */
export function todaysRoutine(
  routines: Routine[],
  sessions: Pick<WorkoutSession, 'routineId'>[],
): Routine | null {
  const groups = groupRoutinesByFolder(routines).filter((group) => group.routines.length > 0);
  if (groups.length === 0) {
    return null;
  }

  for (const session of sessions) {
    if (!session.routineId) {
      continue;
    }
    for (const group of groups) {
      const index = group.routines.findIndex((routine) => routine.id === session.routineId);
      if (index >= 0) {
        return group.routines[(index + 1) % group.routines.length]!;
      }
    }
  }

  return groups[0]!.routines[0]!;
}
