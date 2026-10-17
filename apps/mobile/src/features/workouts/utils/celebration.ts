/** How many celebrated workouts the device remembers (spec 0037 FR-16). */
export const CELEBRATED_MEMORY = 50;

/** The stored list of celebrated workout identities; anything unreadable is empty. */
export function parseCelebrated(raw: string | null): string[] {
  if (!raw) {
    return [];
  }
  try {
    const value: unknown = JSON.parse(raw);
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

/** The list with `workoutId` added, newest last, the oldest dropped past the memory. */
export function withCelebrated(list: string[], workoutId: string): string[] {
  return [...list.filter((id) => id !== workoutId), workoutId].slice(-CELEBRATED_MEMORY);
}

/**
 * Whether the summary celebrates now (FR-15 – FR-18, FR-22): the saved
 * records include at least one, the summary is in front, and this workout was
 * never celebrated on this device.
 */
export function shouldCelebrate({
  workoutId,
  recordCount,
  inFront,
  celebrated,
}: {
  workoutId: string | undefined;
  recordCount: number;
  inFront: boolean;
  celebrated: string[];
}): boolean {
  return Boolean(workoutId) && recordCount > 0 && inFront && !celebrated.includes(workoutId!);
}
