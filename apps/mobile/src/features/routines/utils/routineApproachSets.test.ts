import { describe, expect, it } from 'vitest';

import type { EditableRoutineSet } from '@/features/routines/components/RoutineSetTable';

import { addRoutineApproachSets, routineSetLabel } from './routineApproachSets';

function row(overrides: Partial<EditableRoutineSet> & { id: string }): EditableRoutineSet {
  return {
    minReps: '',
    maxReps: '',
    targetWeight: '',
    targetDuration: '',
    targetDistance: '',
    ...overrides,
  };
}

let counter = 0;
const createId = () => `gen-${(counter += 1)}`;

describe('addRoutineApproachSets', () => {
  it('puts warm-up rows before the first working row (AC-1)', () => {
    const sets = [
      row({ id: 'a', targetWeight: '140', minReps: '3', maxReps: '5' }),
      row({ id: 'b' }),
    ];

    const result = addRoutineApproachSets(sets, 'kg', createId);

    expect(result.outcome).toBe('added');
    expect(result.sets.map((set) => [set.isWarmup ?? false, set.targetWeight, set.maxReps])).toEqual([
      [true, '20', '10'],
      [true, '55', '5'],
      [true, '85', '3'],
      [true, '105', '2'],
      [true, '125', '1'],
      [false, '140', '5'],
      [false, '', ''],
    ]);
    expect(result.sets[0]!.minReps).toBe('10');
  });

  it('uses pound steps (AC-2)', () => {
    const result = addRoutineApproachSets([row({ id: 'a', targetWeight: '315' })], 'lb', createId);
    expect(result.sets.filter((set) => set.isWarmup).map((set) => set.targetWeight)).toEqual([
      '45',
      '125',
      '190',
      '235',
      '285',
    ]);
  });

  it('replaces the warm-up rows ahead of the first working row', () => {
    const sets = [
      row({ id: 'old', targetWeight: '40', isWarmup: true }),
      row({ id: 'a', targetWeight: '60' }),
    ];

    const result = addRoutineApproachSets(sets, 'kg', createId);

    expect(result.sets.some((set) => set.id === 'old')).toBe(false);
    expect(result.sets[result.sets.length - 1]!.id).toBe('a');
  });

  it('explains when there is no working weight, or it is the bar (EF-1, EF-2)', () => {
    const empty = [row({ id: 'a', maxReps: '5' })];
    expect(addRoutineApproachSets(empty, 'kg', createId)).toEqual({ sets: empty, outcome: 'noWeight' });

    const bar = [row({ id: 'a', targetWeight: '20' })];
    expect(addRoutineApproachSets(bar, 'kg', createId)).toEqual({ sets: bar, outcome: 'tooLight' });
  });
});

describe('routineSetLabel', () => {
  it('marks warm-ups and numbers working sets only', () => {
    const sets = [{ isWarmup: true }, { isWarmup: true }, {}, {}];
    expect(sets.map((_, index) => routineSetLabel(sets, index, 'Warmup'))).toEqual([
      'W',
      'W',
      '1',
      '2',
    ]);
  });
});
