import { describe, expect, it } from 'vitest';

import type { EditableRoutineSet } from '@/features/routines/components/RoutineSetTable';

import {
  confirmRoutineApproachSets,
  editRoutineSetValue,
  previewRoutineApproachSets,
  removeRoutineGeneratedWarmUps,
  routineSetLabel,
  routineWarmUpActionFor,
  type RoutineApproachSetsPreview,
} from './routineApproachSets';

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

function previewOf(sets: EditableRoutineSet[], unit: 'kg' | 'lb' = 'kg'): RoutineApproachSetsPreview {
  const result = previewRoutineApproachSets(sets, 'ex-bench', unit);
  if (result.outcome !== 'preview') {
    throw new Error(`expected a preview, got ${result.outcome}`);
  }
  return result;
}

const addRamp = (sets: EditableRoutineSet[]) =>
  confirmRoutineApproachSets(sets, previewOf(sets), createId);

describe('previewRoutineApproachSets', () => {
  it('lists the ramp from the first working row without changing the rows (FR-13)', () => {
    const sets = [row({ id: 'a', targetWeight: '140', minReps: '3', maxReps: '5' })];

    expect(previewRoutineApproachSets(sets, 'ex-bench', 'kg')).toEqual({
      outcome: 'preview',
      exerciseId: 'ex-bench',
      sets: [
        { weight: 20, reps: 10 },
        { weight: 55, reps: 5 },
        { weight: 85, reps: 3 },
        { weight: 105, reps: 2 },
        { weight: 125, reps: 1 },
      ],
      workingWeight: 140,
      unit: 'kg',
      keptWarmUps: 0,
    });
  });

  it('uses pound steps (AC-12)', () => {
    expect(previewOf([row({ id: 'a', targetWeight: '315' })], 'lb').sets.map((set) => set.weight)).toEqual([
      45, 125, 190, 235, 285,
    ]);
  });

  it('counts the warm-up rows that stay (FR-4)', () => {
    const sets = [
      row({ id: 'own', targetWeight: '20', isWarmup: true }),
      row({ id: 'a', targetWeight: '100' }),
    ];
    expect(previewOf(sets).keptWarmUps).toBe(1);
  });

  it('explains when there is no working weight, or it is the bar (FR-5)', () => {
    expect(previewRoutineApproachSets([row({ id: 'a', maxReps: '5' })], 'ex', 'kg')).toEqual({
      outcome: 'noWeight',
    });
    expect(
      previewRoutineApproachSets([row({ id: 'w', targetWeight: '60', isWarmup: true })], 'ex', 'kg'),
    ).toEqual({ outcome: 'noWeight' });
    expect(previewRoutineApproachSets([row({ id: 'a', targetWeight: '20' })], 'ex', 'kg')).toEqual({
      outcome: 'tooLight',
    });
  });
});

describe('confirmRoutineApproachSets', () => {
  it('inserts marked rows after existing warm-ups, before the first working row (FR-3, FR-4)', () => {
    const sets = [
      row({ id: 'own', targetWeight: '20', minReps: '15', maxReps: '15', isWarmup: true }),
      row({ id: 'a', targetWeight: '140', minReps: '3', maxReps: '5' }),
      row({ id: 'b' }),
    ];

    const next = addRamp(sets);

    expect(next.map((set) => [set.id.startsWith('gen-') ? 'gen' : set.id, set.targetWeight, set.maxReps, set.generatedWarmup])).toEqual([
      ['own', '20', '15', undefined],
      ['gen', '20', '10', true],
      ['gen', '55', '5', true],
      ['gen', '85', '3', true],
      ['gen', '105', '2', true],
      ['gen', '125', '1', true],
      ['a', '140', '5', undefined],
      ['b', '', '', undefined],
    ]);
    expect(next[1]!.minReps).toBe('10');
    expect(next.slice(0, 6).every((set) => set.isWarmup)).toBe(true);
    expect(routineWarmUpActionFor(next)).toBe('remove');
  });
});

describe('removeRoutineGeneratedWarmUps', () => {
  it("removes the marked rows and keeps the person's (FR-10, FR-13)", () => {
    const sets = [
      row({ id: 'own', targetWeight: '20', isWarmup: true }),
      row({ id: 'a', targetWeight: '140' }),
    ];

    const next = removeRoutineGeneratedWarmUps(addRamp(sets));

    expect(next.map((set) => set.id)).toEqual(['own', 'a']);
    expect(routineWarmUpActionFor(next)).toBe('add');
  });

  it('keeps a generated row whose value changed, which loses its mark (FR-7)', () => {
    const withRamp = addRamp([row({ id: 'a', targetWeight: '140' })]);
    const edited = withRamp.map((set, index) =>
      index === 2 ? editRoutineSetValue(set, 'targetWeight', '80') : set,
    );

    expect(edited[2]!.generatedWarmup).toBeUndefined();
    expect(removeRoutineGeneratedWarmUps(edited).map((set) => set.targetWeight)).toEqual(['80', '140']);
  });

  it('typing the same value keeps the mark', () => {
    const [first] = addRamp([row({ id: 'a', targetWeight: '140' })]);
    expect(editRoutineSetValue(first!, 'targetWeight', '20').generatedWarmup).toBe(true);
  });

  it('treats rows without the mark (older routines) as the person\'s (EF-7)', () => {
    const sets = [
      row({ id: 'old', targetWeight: '60', isWarmup: true }),
      row({ id: 'a', targetWeight: '140' }),
    ];
    expect(routineWarmUpActionFor(sets)).toBe('add');
    expect(removeRoutineGeneratedWarmUps(sets)).toEqual(sets);
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
