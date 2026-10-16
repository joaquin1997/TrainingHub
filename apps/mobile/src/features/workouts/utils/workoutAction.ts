/** Actions a link can ask of the active-workout screen (spec 0012). */
export type WorkoutLinkAction = 'finish';

/** Reads `?action=` from a route param; anything unknown is ignored. */
export function parseWorkoutAction(
  value: string | string[] | undefined,
): WorkoutLinkAction | null {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw === 'finish' ? 'finish' : null;
}
