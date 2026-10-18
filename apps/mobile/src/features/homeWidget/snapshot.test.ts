import { describe, expect, it } from 'vitest';
import type { Routine, WorkoutSession } from '@workout/domain';

import { widgetHistory } from './snapshot';

const local = (month: number, day: number, hour = 18) => new Date(2026, month - 1, day, hour);

const routine = (id: string): Routine => ({
  id,
  userId: 'u',
  name: id,
  folder: 'Split',
  exercises: [],
  createdAt: '',
  updatedAt: '',
});

function session(start: Date, routineId: string, sets: number, performed = true) {
  return {
    startedAt: start.toISOString(),
    routineId,
    exercises: [
      {
        sets: Array.from({ length: sets }, () => ({ performed })),
      },
    ] as unknown as WorkoutSession['exercises'],
  };
}

const routines = [routine('Torso A'), routine('Pierna A'), routine('Torso B')];
// Thursday 2026-10-15.
const now = local(10, 15, 12);

describe('widgetHistory (spec 0036)', () => {
  it('counts the streak, this week’s performed sets and trained days (AC-1)', () => {
    const history = widgetHistory(
      routines,
      [
        session(local(10, 14), 'Pierna A', 15),
        session(local(10, 12), 'Torso A', 12),
        session(local(10, 6), 'Torso B', 10),
        session(local(9, 29), 'Torso A', 10),
        session(local(9, 22), 'Torso A', 10),
      ],
      now,
    );
    expect(history.streak).toBe(4);
    expect(history.setsThisWeek).toBe(27);
    expect(history.days).toEqual([true, false, true, false, false, false, false]);
    expect(history.weekHadWorkout).toBe(true);
  });

  it('names today’s routine: the one after the last performed (AC-2)', () => {
    const history = widgetHistory(routines, [session(local(10, 14), 'Pierna A', 3)], now);
    expect(history.today).toEqual({ id: 'Torso B', name: 'Torso B' });
  });

  it('counts only performed sets (FR-5)', () => {
    const history = widgetHistory(routines, [session(local(10, 14), 'Torso A', 4, false)], now);
    expect(history.setsThisWeek).toBe(0);
  });

  it('has no routine and no figures for a new account (EF-4, EF-5)', () => {
    const history = widgetHistory([], [], now);
    expect(history).toMatchObject({
      streak: 0,
      setsThisWeek: 0,
      today: null,
      hasRoutines: false,
      weekHadWorkout: false,
    });
    expect(history.days.every((day) => !day)).toBe(true);
  });
});
