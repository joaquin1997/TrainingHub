import { describe, expect, it } from 'vitest';
import type { Routine } from '@workout/domain';

import { todaysRoutine } from './todaysRoutine';

const routine = (id: string, folder?: string): Routine => ({
  id,
  userId: 'u',
  name: id,
  folder,
  exercises: [],
  createdAt: '2026-10-01T00:00:00.000Z',
  updatedAt: '2026-10-01T00:00:00.000Z',
});

const ppl = [routine('Push', 'PPL'), routine('Pull', 'PPL'), routine('Legs', 'PPL')];

describe('todaysRoutine', () => {
  it('is null with no routines', () => {
    expect(todaysRoutine([], [{ routineId: 'Push' }])).toBeNull();
  });

  it('is the first routine of the list when none was performed', () => {
    expect(todaysRoutine([routine('Solo'), ...ppl], [])?.id).toBe('Push');
  });

  it('is the next routine in the folder after the last performed one (AC-3)', () => {
    expect(todaysRoutine(ppl, [{ routineId: 'Pull' }, { routineId: 'Push' }])?.id).toBe('Legs');
  });

  it('wraps from the last routine back to the first', () => {
    expect(todaysRoutine(ppl, [{ routineId: 'Legs' }])?.id).toBe('Push');
  });

  it('rotates unfiled routines among themselves', () => {
    const routines = [...ppl, routine('A'), routine('B')];
    expect(todaysRoutine(routines, [{ routineId: 'B' }])?.id).toBe('A');
  });

  it('skips workouts of deleted routines and workouts with no routine', () => {
    expect(
      todaysRoutine(ppl, [{ routineId: undefined }, { routineId: 'gone' }, { routineId: 'Push' }])?.id,
    ).toBe('Pull');
  });

  it('falls back to the first routine when no workout points at an existing one', () => {
    expect(todaysRoutine(ppl, [{ routineId: 'gone' }])?.id).toBe('Push');
  });
});
