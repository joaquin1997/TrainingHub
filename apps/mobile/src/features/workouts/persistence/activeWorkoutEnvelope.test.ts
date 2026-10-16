import { describe, expect, it } from 'vitest';

import type { WorkoutSessionDraft } from '@/features/workouts/state/workoutDraftStore';

import {
  parsePersistedActiveWorkout,
  serializeActiveWorkout,
} from './activeWorkoutEnvelope';

const draft: WorkoutSessionDraft = {
  id: 'workout-session-r1',
  clientId: 'lzx-abcdefgh',
  routineId: 'r1',
  routineName: 'Push',
  startedAt: '2026-10-16T09:00:00.000Z',
  unit: 'lb',
  notes: 'felt strong',
  exercises: [
    {
      id: 'we-1',
      exerciseId: 'ex-bench',
      exerciseName: 'Bench',
      order: 1,
      entries: [
        { id: 's1', order: 1, reps: '8', weightKg: '135', done: true, type: 'warmup', restSeconds: 90 },
      ],
    },
  ],
};

describe('active workout envelope', () => {
  it('round-trips the draft for its owner, every field intact', () => {
    const raw = serializeActiveWorkout(draft, 'user-a');

    expect(parsePersistedActiveWorkout(raw, 'user-a')).toEqual({ kind: 'ok', draft });
  });

  it('reports a draft that belongs to someone else as foreign', () => {
    const raw = serializeActiveWorkout(draft, 'user-a');

    expect(parsePersistedActiveWorkout(raw, 'user-b')).toEqual({ kind: 'foreign' });
  });

  it('reports nothing stored as empty', () => {
    expect(parsePersistedActiveWorkout(null, 'user-a')).toEqual({ kind: 'empty' });
    expect(parsePersistedActiveWorkout('', 'user-a')).toEqual({ kind: 'empty' });
  });

  it('reports unreadable data, another version or a broken draft as invalid', () => {
    const envelope = JSON.parse(serializeActiveWorkout(draft, 'user-a'));

    expect(parsePersistedActiveWorkout('{not json', 'user-a')).toEqual({ kind: 'invalid' });
    expect(
      parsePersistedActiveWorkout(JSON.stringify({ ...envelope, v: 0 }), 'user-a'),
    ).toEqual({ kind: 'invalid' });
    expect(
      parsePersistedActiveWorkout(
        JSON.stringify({ ...envelope, draft: { ...draft, exercises: 'x' } }),
        'user-a',
      ),
    ).toEqual({ kind: 'invalid' });
  });
});
