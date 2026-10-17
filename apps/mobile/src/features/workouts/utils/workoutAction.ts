/**
 * Actions a link can ask of the active-workout screen: `finish` from the lock
 * screen (spec 0012), `switch` to finish it and start another routine (0019),
 * `discard` from the lock screen, always confirmed in the app (0035).
 */
export type WorkoutLinkAction = 'finish' | 'switch' | 'discard';

/** Reads `?action=` from a route param; anything unknown is ignored. */
export function parseWorkoutAction(
  value: string | string[] | undefined,
): WorkoutLinkAction | null {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw === 'finish' || raw === 'switch' || raw === 'discard' ? raw : null;
}

/**
 * What a discard link does (spec 0035 FR-21, EF-6): ask to discard only when
 * it names the workout in progress; a link for a workout that already ended,
 * or for another one, touches nothing.
 */
export function resolveDiscardLink(
  activeClientId: string | null | undefined,
  linkWorkoutId: string | string[] | undefined,
): 'confirm' | 'ended' {
  const id = Array.isArray(linkWorkoutId) ? linkWorkoutId[0] : linkWorkoutId;
  return activeClientId && id && activeClientId === id ? 'confirm' : 'ended';
}
