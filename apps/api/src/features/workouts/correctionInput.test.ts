import { describe, expect, it } from 'vitest';
import { parseWorkoutCorrection } from './correctionInput.js';
export const validCorrection = () => ({ expectedRevision: 0, mutationId: 'm', notes: null, exercises: [{ id: 'e', notes: null,
  sets: [{ id: 's', type: 'normal', performed: true, reps: 5, repsLeft: null, repsRight: null, weightKg: 10, durationSeconds: null, distanceMeters: null }],
}] });
describe('strict correction input', () => {
  it('accepts explicit scalar values and clearing notes/measurements', () => expect(parseWorkoutCorrection(validCorrection())).toEqual(validCorrection()));
  it.each(['routineId', 'startedAt', 'completedAt', 'clientId', 'status'])('rejects protected field %s', (key) => expect(parseWorkoutCorrection({ ...validCorrection(), [key]: 'changed' })).toBeNull());
  it.each([-1, NaN, Infinity, 0.5, '10'])('rejects invalid reps %s', (reps) => {
    const input = validCorrection(); input.exercises[0]!.sets[0]!.reps = reps as number;
    expect(parseWorkoutCorrection(input)).toBeNull();
  });
  it('rejects unknown/missing child fields and repeated identities', () => {
    const input = validCorrection(); input.exercises.push(input.exercises[0]!);
    expect(parseWorkoutCorrection(input)).toBeNull();
    const child = validCorrection(); (child.exercises[0]!.sets[0] as Record<string, unknown>).order = 100;
    expect(parseWorkoutCorrection(child)).toBeNull();
  });
});
