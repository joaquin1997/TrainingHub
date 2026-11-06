import { afterEach, describe, expect, it, vi } from 'vitest';
import type { WorkoutSession, WorkoutSet } from '@workout/domain';
import { correctionFields } from '@workout/domain/workoutCorrections';
import { correctionIsDirty, correctionPayload, createCorrectionDraft } from './correctionDraft';
import { correctionStore } from './correctionStore';
import { saveCorrection } from './saveCorrection';
import { invalidateSavedWorkout, savedWorkoutVersion, subscribeWorkoutInvalidation } from './workoutInvalidation';
import { getActiveWorkout, setActiveWorkout, clearActiveWorkout } from '../state/workoutDraftStore';
const now = '2026-11-04T10:00:00Z';
const row = (extra: Partial<WorkoutSet> = {}): WorkoutSet => ({ id: 's', workoutExerciseId: 'e', order: 1, type: 'normal', reps: 5, weightKg: 45.359237,
  performed: true, completedAt: now, createdAt: now, updatedAt: now, ...extra });
const session = (sets = [row()]): WorkoutSession => ({ id: 'w', userId: 'owner', revision: 0, clientId: 'saved', status: 'completed', startedAt: now, completedAt: now, createdAt: now, updatedAt: now,
  exercises: [{ id: 'e', workoutSessionId: 'w', exerciseId: 'catalog', exerciseName: 'Synthetic', order: 1, sets, createdAt: now, updatedAt: now }] });
const setup = () => {
  const draft = createCorrectionDraft(session(), 'owner', 'lb'); draft.notes = 'edited';
  correctionStore.set('owner', 'w', { draft, saving: false });
};
afterEach(() => { correctionStore.remove('owner', 'w'); correctionStore.remove('other', 'w'); clearActiveWorkout(); });
describe('saved correction draft (0050)', () => {
  it('preserves exact canonical weight on unrelated edits, with a captured display unit', () => {
    const draft = createCorrectionDraft(session(), 'owner', 'lb');
    expect(draft.exercises[0]!.sets[0]!.values.weightKg).toBe('100');
    expect(correctionIsDirty(draft)).toBe(false);
    draft.notes = 'note';
    expect(correctionIsDirty(draft)).toBe(true);
    expect(correctionPayload(draft, 'm').exercises[0]!.sets[0]!.weightKg).toBe(45.359237);
    draft.exercises[0]!.sets[0]!.values.weightKg = '10';
    expect(correctionPayload(draft, 'm').exercises[0]!.sets[0]!.weightKg).toBeCloseTo(4.5359237);
    expect(draft.unit).toBe('lb');
  });
  it('uses saved per-row shape for time/distance and blank siblings, without catalog reinterpretation', () => {
    const saved = row({ reps: undefined, weightKg: undefined, durationSeconds: 45, distanceMeters: 300 });
    expect(correctionFields(saved, [saved])).toEqual(['durationSeconds', 'distanceMeters']);
    expect(correctionFields({}, [saved])).toEqual(['durationSeconds', 'distanceMeters']);
    const draft = createCorrectionDraft(session([saved]), 'owner', 'kg');
    draft.exercises[0]!.sets[0]!.values.durationSeconds = '60';
    expect(correctionPayload(draft, 'm').exercises[0]!.sets[0]).toMatchObject({ durationSeconds: 60, distanceMeters: 300, reps: null, weightKg: null });
  });
  it('recalculates unilateral total from the matching sides and preserves shared load', () => {
    const draft = createCorrectionDraft(session([row({ reps: 18, repsLeft: 10, repsRight: 8 })]), 'owner', 'kg');
    draft.exercises[0]!.sets[0]!.values.repsLeft = '6';
    expect(correctionPayload(draft, 'm').exercises[0]!.sets[0]).toMatchObject({ reps: 14, repsLeft: 6, repsRight: 8, weightKg: 45.359237 });
  });
  it('preserves explicit old performed flags and warm-up eligibility without inventing measurements', () => {
    const draft = createCorrectionDraft(session([row({ reps: undefined, weightKg: undefined, completedAt: undefined, performed: true, isWarmup: true })]), 'owner', 'kg');
    expect(correctionPayload(draft, 'm').exercises[0]!.sets[0]).toMatchObject({ performed: true, type: 'warmup', reps: null });
    draft.exercises[0]!.sets[0]!.performed = false;
    expect(() => correctionPayload(draft, 'm')).toThrow('noPerformed');
  });
  it.each(['-1', 'bad', 'Infinity', '0.5'])('rejects invalid reps %s without changing the original', (value) => {
    const original = session(); const draft = createCorrectionDraft(original, 'owner', 'kg');
    draft.exercises[0]!.sets[0]!.values.reps = value;
    expect(() => correctionPayload(draft, 'm')).toThrow('invalid'); expect(original.exercises[0]!.sets[0]!.reps).toBe(5);
  });
  it('keeps older APIs read-only', () => {
    const old = session(); delete old.revision;
    expect(() => correctionPayload(createCorrectionDraft(old, 'owner', 'kg'), 'm')).toThrow('unsupported');
  });
});
describe('correction save lifecycle', () => {
  it('retries an uncertain result with the same mutation and leaves active reference snapshots untouched', async () => {
    setup();
    const active = { id: 'a', clientId: 'active', routineId: 'r', routineName: 'Active', startedAt: now, exercises: [], startingRecords: { catalog: { exerciseId: 'catalog', bests: { heaviestWeight: 100 }, repsAtWeight: [] } } };
    setActiveWorkout(active);
    const observed = vi.fn(); const stop = subscribeWorkoutInvalidation(observed);
    const send = vi.fn().mockRejectedValueOnce(new Error('lost response')).mockResolvedValue({ ...session(), revision: 1 });
    const deps = { send, stillOwned: () => true, newId: vi.fn(() => 'stable-mutation'), classify: () => 'unavailable' as const };
    expect(await saveCorrection('owner', 'w', deps)).toBe(false);
    expect(correctionStore.get('owner', 'w')?.draft.notes).toBe('edited');
    expect(await saveCorrection('owner', 'w', deps)).toBe(true);
    expect(send.mock.calls.map(([input]) => input.mutationId)).toEqual(['stable-mutation', 'stable-mutation']);
    expect(observed).toHaveBeenCalledWith({ ownerId: 'owner', workoutId: 'w', exerciseIds: ['catalog'] });
    expect(getActiveWorkout()).toBe(active); stop();
  });
  it('retains conflict edits and isolates them from other identities', async () => {
    setup();
    await saveCorrection('owner', 'w', { send: async () => { throw new Error('409'); }, stillOwned: () => true, newId: () => 'm', classify: () => 'conflict' });
    expect(correctionStore.get('owner', 'w')).toMatchObject({ error: 'conflict', saving: false, draft: { notes: 'edited' } });
    expect(correctionStore.get('other', 'w')).toBeNull();
  });
  it('ignores completion after an account switch and coalesces double saves', async () => {
    setup(); let owned = true; let resolve!: (value: WorkoutSession) => void;
    const send = vi.fn(() => new Promise<WorkoutSession>((done) => { resolve = done; }));
    const deps = { send, stillOwned: () => owned, newId: () => 'm', classify: () => 'unavailable' as const };
    const first = saveCorrection('owner', 'w', deps);
    expect(await saveCorrection('owner', 'w', deps)).toBe(false);
    owned = false; resolve({ ...session(), revision: 1 });
    expect(await first).toBe(false); expect(send).toHaveBeenCalledTimes(1);
    expect(correctionStore.get('owner', 'w')).toMatchObject({ saving: false, draft: { notes: 'edited' } });
  });
  it('versions only the affected owner and never exposes another owner draft', () => {
    const previous = savedWorkoutVersion('other');
    invalidateSavedWorkout({ ownerId: 'owner', workoutId: 'w', exerciseIds: ['catalog'] });
    expect(savedWorkoutVersion('other')).toBe(previous);
  });
});
