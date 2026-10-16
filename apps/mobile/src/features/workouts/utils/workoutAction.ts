/**
 * Actions a link can ask of the active-workout screen: `finish` from the lock
 * screen (spec 0012), `switch` to finish it and start another routine (0019).
 */
export type WorkoutLinkAction = 'finish' | 'switch';

/** Reads `?action=` from a route param; anything unknown is ignored. */
export function parseWorkoutAction(
  value: string | string[] | undefined,
): WorkoutLinkAction | null {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw === 'finish' || raw === 'switch' ? raw : null;
}
