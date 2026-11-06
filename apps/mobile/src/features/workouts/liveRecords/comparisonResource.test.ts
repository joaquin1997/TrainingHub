import { describe, expect, it, vi } from 'vitest';
import type { ExerciseComparisonReference } from '@workout/domain';
import { createComparisonResource, lastSessionFor, withComparisonReferences, type ComparisonLoadStates } from './comparisonResource';
import { buildComparisonFeedback } from './comparisonFeedback';
import { parsePersistedActiveWorkout, serializeActiveWorkout } from '../persistence/activeWorkoutEnvelope';
import type { WorkoutSessionDraft } from '../state/workoutDraftStore';
const draft = (): WorkoutSessionDraft => ({ id: 'w', clientId: 'c', routineId: 'r', routineName: 'R', startedAt: '2026-11-04T10:00:00Z', exercises: [{
  id: 'a', exerciseId: 'e', exerciseName: 'E', order: 1, entries: [{ id: 's', order: 1, done: true, type: 'normal', reps: '5', weightKg: '47' }],
}] });
const reference = (): ExerciseComparisonReference => ({ exerciseId: 'e',
  historical: { status: 'ready', value: { exerciseId: 'e', bests: { heaviestWeight: 50 }, repsAtWeight: [] } },
  lastSession: { status: 'ready', value: { sessionId: 'prior', date: '2026-11-03T10:00:00Z', records: { exerciseId: 'e', bests: { heaviestWeight: 45 }, repsAtWeight: [] } } },
});
function harness(list = vi.fn(async () => [reference()])) {
  let current: WorkoutSessionDraft | null = draft();
  let states: ComparisonLoadStates = {};
  const resource = createComparisonResource({ get: () => current, set: (next) => { current = next; }, list,
    changed: (next) => { states = next; }, classify: () => 'offline' });
  return { resource, list, get: () => current!, states: () => states, replace: (next: WorkoutSessionDraft | null) => { current = next; } };
}
describe('comparison resource and feedback (0048)', () => {
  it('freezes successful references and retries only missing comparisons', async () => {
    const h = harness();
    await h.resource.load();
    await h.resource.load();
    expect(h.list).toHaveBeenCalledTimes(1);
    expect(h.states().e).toEqual({});
    expect(buildComparisonFeedback(h.get()).bySet.s).toMatchObject([{ baselineScope: 'lastSession', value: 47, baselineValue: 45 }]);
    const changed = reference();
    changed.lastSession = { status: 'ready', value: null };
    expect(withComparisonReferences(h.get(), [changed])).toBe(h.get());
  });
  it('shows loading while awaiting and error after failure, without blocking or fabricating empty history', async () => {
    let resolve!: (v: ExerciseComparisonReference[]) => void;
    const list = vi.fn(() => new Promise<ExerciseComparisonReference[]>((done) => { resolve = done; }));
    const h = harness(list);
    const loading = h.resource.load();
    expect(h.states().e).toEqual({ historical: 'loading', lastSession: 'loading' });
    resolve([reference()]);
    await loading;
    const fail = harness(vi.fn(async () => { throw new Error('offline'); }));
    await fail.resource.load();
    expect(fail.states().e).toEqual({ historical: 'offline', lastSession: 'offline' });
    expect(fail.get().startingRecords).toBeUndefined();
    await fail.resource.load();
    expect(fail.list).toHaveBeenCalledTimes(2);
  });
  it('supports partial sources and retries refusal on manual retry or a fresh mount', async () => {
    const partial = reference(); partial.lastSession = { status: 'unavailable' };
    const h = harness(vi.fn(async () => [partial]));
    await h.resource.load();
    expect(h.states().e).toEqual({ lastSession: 'refused' });
    await h.resource.load(); expect(h.list).toHaveBeenCalledTimes(1);
    await h.resource.load(true); expect(h.list).toHaveBeenCalledTimes(2);
    expect(h.get().startingRecords?.e?.bests.heaviestWeight).toBe(50);
  });
  it.each(['workout', 'account', 'removed'])('ignores a late reply after %s changes', async (change) => {
    let resolve!: (v: ExerciseComparisonReference[]) => void;
    const h = harness(vi.fn(() => new Promise<ExerciseComparisonReference[]>((done) => { resolve = done; })));
    const pending = h.resource.load();
    if (change === 'account') { h.resource.stop(); h.replace(draft()); }
    if (change === 'workout') h.replace({ ...draft(), clientId: 'replacement' });
    if (change === 'removed') h.replace({ ...draft(), exercises: [] });
    resolve([reference()]); await pending;
    expect(h.get().startingRecords).toBeUndefined();
    expect(h.get().lastSessionReferences).toBeUndefined();
  });
  it('restores valid snapshots, rejecting malformed/future or mismatched identity references', () => {
    const loaded = withComparisonReferences(draft(), [reference()]);
    const result = parsePersistedActiveWorkout(serializeActiveWorkout(loaded, 'owner'), 'owner');
    expect(result.kind === 'ok' && lastSessionFor(result.draft, 'e')).toEqual(lastSessionFor(loaded, 'e'));
    expect(lastSessionFor({ ...loaded, lastSessionReferences: { e: { ...lastSessionFor(loaded, 'e')!, date: '2027-01-01' } } }, 'e')).toBeUndefined();
    const bad = reference();
    if (bad.historical.status === 'ready') bad.historical.value.exerciseId = 'other';
    expect(withComparisonReferences(draft(), [bad]).startingRecords).toBeUndefined();
  });
  it('recalculates after undo/warm-up and never invents a first-session improvement', () => {
    const loaded = withComparisonReferences(draft(), [reference()]);
    loaded.exercises[0]!.entries[0]!.done = false;
    expect(buildComparisonFeedback(loaded).bySet.s).toBeUndefined();
    loaded.exercises[0]!.entries[0]!.done = true;
    loaded.exercises[0]!.entries[0]!.type = 'warmup';
    expect(buildComparisonFeedback(loaded).bySet.s).toBeUndefined();
    const first = reference(); first.historical = { status: 'ready', value: { exerciseId: 'e', bests: {}, repsAtWeight: [] } }; first.lastSession = { status: 'ready', value: null };
    expect(buildComparisonFeedback(withComparisonReferences(draft(), [first])).bySet.s).toEqual([]);
  });
});
