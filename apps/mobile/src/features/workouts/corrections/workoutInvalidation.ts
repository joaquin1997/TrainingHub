export interface WorkoutInvalidation { ownerId: string; workoutId: string; exerciseIds: string[] }
const listeners = new Set<(event: WorkoutInvalidation) => void>();
const versions = new Map<string, number>();
export const savedWorkoutVersion = (ownerId: string) => versions.get(ownerId) ?? 0;
export function invalidateSavedWorkout(event: WorkoutInvalidation) { versions.set(event.ownerId, savedWorkoutVersion(event.ownerId) + 1); listeners.forEach((listener) => listener(event)); }
export function subscribeWorkoutInvalidation(listener: (event: WorkoutInvalidation) => void) {
  listeners.add(listener); return () => { listeners.delete(listener); };
}
