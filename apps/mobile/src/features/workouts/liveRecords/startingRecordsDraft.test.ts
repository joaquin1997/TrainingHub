import type { StartingRecords } from '@workout/domain';
import { describe, expect, it } from 'vitest';

import {
  parsePersistedActiveWorkout,
  serializeActiveWorkout,
} from '@/features/workouts/persistence/activeWorkoutEnvelope';
import type { WorkoutSessionDraft } from '@/features/workouts/state/workoutDraftStore';

import {
  missingStartingRecordIds,
  startingRecordsFor,
  withStartingRecords,
} from './startingRecordsDraft';

const exercise = (id: string, exerciseId: string) => ({
  id,
  exerciseId,
  exerciseName: exerciseId,
  order: 1,
  entries: [],
});

const draft = (overrides: Partial<WorkoutSessionDraft> = {}): WorkoutSessionDraft => ({
  id: 'w',
  clientId: 'c',
  routineId: 'r',
  routineName: 'Push',
  startedAt: '2026-10-17T09:00:00.000Z',
  exercises: [exercise('we-1', 'bench'), exercise('we-2', 'fly'), exercise('we-3', 'bench')],
  ...overrides,
});

const records = (exerciseId: string, heaviestWeight?: number): StartingRecords => ({
  exerciseId,
  bests: heaviestWeight === undefined ? {} : { heaviestWeight },
  repsAtWeight: [],
});

describe('missingStartingRecordIds', () => {
  it('lists every exercise of a new workout once, in order', () => {
    expect(missingStartingRecordIds(draft())).toEqual(['bench', 'fly']);
  });

  it('lists only exercises without kept records (added, replaced, failed)', () => {
    expect(
      missingStartingRecordIds(draft({ startingRecords: { bench: records('bench', 100) } })),
    ).toEqual(['fly']);
  });

  it('treats a malformed stored entry as not loaded', () => {
    const stored = draft({
      startingRecords: { bench: { exerciseId: 'bench' } as unknown as StartingRecords },
    });
    expect(missingStartingRecordIds(stored)).toEqual(['bench', 'fly']);
    expect(startingRecordsFor(stored, 'bench')).toBeUndefined();
  });
});

describe('withStartingRecords', () => {
  it('keeps loaded records, an empty one included (nothing to beat)', () => {
    const next = withStartingRecords(draft(), [records('bench', 100), records('fly')]);
    expect(next.startingRecords).toEqual({ bench: records('bench', 100), fly: records('fly') });
    expect(missingStartingRecordIds(next)).toEqual([]);
  });

  it('never replaces records already kept (FR-4)', () => {
    const start = draft({ startingRecords: { bench: records('bench', 100) } });
    const next = withStartingRecords(start, [records('bench', 120), records('fly')]);
    expect(next.startingRecords?.bench).toEqual(records('bench', 100));
  });

  it('returns the same draft when nothing is added', () => {
    const start = draft({ startingRecords: { bench: records('bench', 100) } });
    expect(withStartingRecords(start, [records('bench', 120)])).toBe(start);
  });
});

describe('kept with the stored workout (FR-3, AC-8)', () => {
  it('survives serializing and reading back the active workout', () => {
    const kept = withStartingRecords(draft(), [records('bench', 100)]);
    const restored = parsePersistedActiveWorkout(serializeActiveWorkout(kept, 'u1'), 'u1');

    expect(restored.kind).toBe('ok');
    expect(restored.kind === 'ok' && startingRecordsFor(restored.draft, 'bench')).toEqual(
      records('bench', 100),
    );
  });
});
