import { describe, expect, it } from 'vitest';

import { replaceRoutineRowExercise } from './replaceRoutineExercise';

const rows = [
  {
    id: 'row-1',
    exerciseId: 'leg-press',
    exerciseQuery: 'Leg press',
    restSeconds: '120',
    supersetGroup: '1',
    sets: [
      { id: 's1', minReps: '8', maxReps: '10', targetWeight: '100' },
      { id: 's2', minReps: '8', maxReps: '10', targetWeight: '' },
    ],
  },
  {
    id: 'row-2',
    exerciseId: 'curl',
    exerciseQuery: 'Curl',
    restSeconds: '',
    supersetGroup: '1',
    sets: [{ id: 's3', minReps: '', maxReps: '12', targetWeight: '' }],
  },
];

describe('replaceRoutineRowExercise', () => {
  it('swaps the exercise and keeps targets, rest, superset and position (AC-4)', () => {
    const next = replaceRoutineRowExercise(rows, 'row-1', {
      id: 'hack',
      name: 'Hack squat',
    });

    expect(next.map((row) => row.id)).toEqual(['row-1', 'row-2']);
    expect(next[0]).toEqual({
      ...rows[0],
      exerciseId: 'hack',
      warmUpMetadata: { name: 'Hack squat' },
      exerciseQuery: 'Hack squat',
    });
    expect(next[1]).toBe(rows[1]);
  });

  it('leaves the rows alone for an unknown row', () => {
    expect(
      replaceRoutineRowExercise(rows, 'nope', { id: 'hack', name: 'Hack squat' }),
    ).toEqual(rows);
  });
});
