import type { UpdateWorkoutSessionInput } from '@workout/domain';
import { CORRECTION_QUANTITIES } from '@workout/domain';
const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const exact = (value: Record<string, unknown>, keys: string[]) => Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key));
const id = (v: unknown) => typeof v === 'string' && v.length > 0 && v.length <= 128;
const notes = (v: unknown) => v === null || (typeof v === 'string' && v.length <= 20_000);
export function parseWorkoutCorrection(value: unknown): UpdateWorkoutSessionInput | null {
  if (!object(value) || !exact(value, ['expectedRevision', 'mutationId', 'notes', 'exercises']) ||
      !Number.isSafeInteger(value.expectedRevision) || (value.expectedRevision as number) < 0 || !id(value.mutationId) || !notes(value.notes) ||
      !Array.isArray(value.exercises) || value.exercises.length > 200) return null;
  const exerciseIds = new Set<string>();
  const setIds = new Set<string>();
  for (const exercise of value.exercises) {
    if (!object(exercise) || !exact(exercise, ['id', 'notes', 'sets']) || !id(exercise.id) || !notes(exercise.notes) ||
        !Array.isArray(exercise.sets) || exercise.sets.length > 500 || exerciseIds.has(exercise.id as string)) return null;
    exerciseIds.add(exercise.id as string);
    for (const set of exercise.sets) {
      if (!object(set) || !exact(set, ['id', 'type', 'performed', ...CORRECTION_QUANTITIES]) || !id(set.id) || setIds.has(set.id as string) ||
          !['normal', 'warmup', 'drop', 'failure'].includes(set.type as string) || typeof set.performed !== 'boolean') return null;
      setIds.add(set.id as string);
      for (const field of CORRECTION_QUANTITIES) {
        const n = set[field];
        if (n !== null && (typeof n !== 'number' || !Number.isFinite(n) || n < 0 || n > 1_000_000 ||
          (['reps', 'repsLeft', 'repsRight', 'durationSeconds'].includes(field) && !Number.isInteger(n)))) return null;
      }
    }
  }
  return value as unknown as UpdateWorkoutSessionInput;
}
