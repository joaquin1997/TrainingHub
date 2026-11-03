import { describe, expect, it } from 'vitest';
import { confirmApproachSets, precedingWorkoutWarmUpMetadata, previewApproachSets } from './approachSetsDraft';
import { setWorkoutSetType, type WorkoutSessionDraft } from './workoutDraftStore';
import { parsePersistedActiveWorkout, serializeActiveWorkout } from '../persistence/activeWorkoutEnvelope';
import { resolveWarmUpContext } from '@/lib/warmUpContext';

const draft = (): WorkoutSessionDraft => ({
  id: 'w', clientId: 'c', routineId: 'r', routineName: 'Test', unit: 'kg', startedAt: '2026-11-03T10:00:00Z',
  exercises: [{ id: 'first', exerciseId: 'e1', exerciseName: 'Bench', order: 1, warmUpMetadata: { category: 'chest' },
    entries: [{ id: 's1', order: 1, reps: '5', weightKg: '100', type: 'normal', done: false }] },
  { id: 'second', exerciseId: 'e2', exerciseName: 'Cable fly', order: 2, warmUpMetadata: { category: 'chest', loadingKind: 'machine' },
    entries: [{ id: 's2', order: 1, reps: '8', weightKg: '60', type: 'normal', done: false }] }],
});
describe('warm-up configuration in actual drafts', () => {
  it('distinguishes performed workout context from preceding planned/unfinished/warm-up work', () => {
    const d = draft();
    expect(precedingWorkoutWarmUpMetadata(d, 'second')).toEqual([]);
    d.exercises[0]!.entries[0]!.done = true;
    expect(precedingWorkoutWarmUpMetadata(d, 'second')).toHaveLength(1);
    d.exercises[0]!.entries[0]!.type = 'warmup';
    expect(precedingWorkoutWarmUpMetadata(d, 'second')).toEqual([]);
  });
  it('preserves values, completion and rest when selecting a named type; current type is a no-op', () => {
    const d = draft();
    d.exercises[0]!.entries[0]!.done = true;
    d.exercises[0]!.entries[0]!.generatedWarmup = true;
    d.rest = { endsAt: '2026-11-03T10:01:00Z', totalSeconds: 60, workoutExerciseId: 'first' };
    expect(setWorkoutSetType(d, 'first', 's1', 'normal')).toBe(d);
    const updated = setWorkoutSetType(d, 'first', 's1', 'warmup');
    expect(updated.exercises[0]!.entries[0]).toMatchObject({ done: true, weightKg: '100', reps: '5', type: 'warmup' });
    expect(updated.exercises[0]!.entries[0]!.generatedWarmup).toBeUndefined();
    expect(updated.rest).toBe(d.rest);
  });
  it('refuses insertion after working weight or unit changed in a configurable preview', () => {
    const d = draft();
    const context = resolveWarmUpContext(d.exercises[1]!.warmUpMetadata!, [], 'kg');
    const preview = previewApproachSets(d, 'second', context);
    if (preview.outcome !== 'preview') throw new Error('expected ramp');
    d.exercises[1]!.entries[0]!.weightKg = '20';
    expect(confirmApproachSets(d, 'second', preview)).toBe(d);
    d.exercises[1]!.entries[0]!.weightKg = '60'; d.unit = 'lb';
    expect(confirmApproachSets(d, 'second', preview)).toBe(d);
  });
  it('round-trips pending choices for their owner and discards malformed optional metadata/preferences only', () => {
    const d = draft();
    d.warmUpPreferences = { e2: { value: { loadingKind: 'machine', approachSetCount: 5, incrementKg: 2.5 }, pending: true } };
    const raw = serializeActiveWorkout(d, 'alice');
    expect(parsePersistedActiveWorkout(raw, 'alice')).toEqual({ kind: 'ok', draft: d });
    expect(parsePersistedActiveWorkout(raw, 'bob')).toEqual({ kind: 'foreign' });
    const damaged = JSON.parse(raw);
    damaged.draft.warmUpPreferences.e2.value.incrementKg = -1;
    damaged.draft.exercises[0].warmUpMetadata.equipment = 'barbell';
    const restored = parsePersistedActiveWorkout(JSON.stringify(damaged), 'alice');
    if (restored.kind !== 'ok') throw new Error('workout must survive');
    expect(restored.draft.warmUpPreferences).toEqual({});
    expect(restored.draft.exercises[0]!.warmUpMetadata).toBeUndefined();
    expect(restored.draft.exercises[0]!.entries).toEqual(d.exercises[0]!.entries);
  });
});
