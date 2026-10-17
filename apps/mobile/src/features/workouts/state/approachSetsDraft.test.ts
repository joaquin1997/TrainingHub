import { describe, expect, it } from 'vitest';

import {
  canAddApproachSets,
  confirmApproachSets,
  previewApproachSets,
  removeGeneratedWarmUps,
  warmUpActionFor,
  type ApproachSetsPreview,
} from './approachSetsDraft';
import {
  buildWorkoutSessionDraft,
  cycleWorkoutSetType,
  removeExerciseFromWorkout,
  toCreateWorkoutSessionInput,
  toggleWorkoutSetDone,
  updateWorkoutSetDraft,
  type WorkoutSessionDraft,
  type WorkoutSetDraft,
} from './workoutDraftStore';

function set(overrides: Partial<WorkoutSetDraft> & { id: string }): WorkoutSetDraft {
  return { order: 0, reps: '', weightKg: '', done: false, type: 'normal', ...overrides };
}

function draftWith(entries: WorkoutSetDraft[], unit: 'kg' | 'lb' = 'kg'): WorkoutSessionDraft {
  return {
    id: 'w1',
    clientId: 'c1',
    routineId: 'r1',
    routineName: 'Legs',
    startedAt: '2026-10-17T08:00:00.000Z',
    unit,
    exercises: [
      {
        id: 'we-squat',
        exerciseId: 'ex-squat',
        exerciseName: 'Squat',
        order: 1,
        entries: entries.map((entry, index) => ({ ...entry, order: index + 1 })),
      },
    ],
  };
}

const entriesOf = (draft: WorkoutSessionDraft) => draft.exercises[0]!.entries;

function previewOf(draft: WorkoutSessionDraft): ApproachSetsPreview {
  const result = previewApproachSets(draft, 'we-squat');
  if (result.outcome !== 'preview') {
    throw new Error(`expected a preview, got ${result.outcome}`);
  }
  return result;
}

/** Previews and confirms, as a tap plus "Add" would. */
const addRamp = (draft: WorkoutSessionDraft) =>
  confirmApproachSets(draft, 'we-squat', previewOf(draft));

const squats140 = () =>
  draftWith([
    set({ id: 'w-1', weightKg: '140', reps: '5' }),
    set({ id: 'w-2', weightKg: '140', reps: '5' }),
  ]);

describe('previewApproachSets', () => {
  it('lists the ramp from the working weight and changes nothing (AC-1, AC-2)', () => {
    const draft = squats140();
    const before = JSON.stringify(draft);

    const preview = previewApproachSets(draft, 'we-squat');

    expect(preview).toEqual({
      outcome: 'preview',
      exerciseId: 'ex-squat',
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
    expect(JSON.stringify(draft)).toBe(before);
  });

  it('reads the ghosted weight, in the session unit (AC-12)', () => {
    const preview = previewOf(draftWith([set({ id: 'w-1', weightPlaceholder: '315' })], 'lb'));

    expect(preview.unit).toBe('lb');
    expect(preview.workingWeight).toBe(315);
    expect(preview.sets.map((item) => item.weight)).toEqual([45, 125, 190, 235, 285]);
  });

  it('says how many warm-ups ahead of the working set stay (FR-4, AC-4)', () => {
    const draft = draftWith([
      set({ id: 'own', type: 'warmup', weightKg: '20', reps: '15' }),
      set({ id: 'w-1', weightKg: '140', reps: '5' }),
    ]);

    expect(previewOf(draft).keptWarmUps).toBe(1);
  });

  it("keeps 0024's notices instead of a preview (FR-5, EF-4)", () => {
    expect(previewApproachSets(draftWith([set({ id: 'w-1', reps: '5' })]), 'we-squat')).toEqual({
      outcome: 'noWeight',
    });
    expect(
      previewApproachSets(draftWith([set({ id: 'w', type: 'warmup', weightKg: '60' })]), 'we-squat'),
    ).toEqual({ outcome: 'noWeight' });
    expect(previewApproachSets(draftWith([]), 'we-squat')).toEqual({ outcome: 'noWeight' });
    expect(
      previewApproachSets(draftWith([set({ id: 'w-1', weightKg: '20', reps: '10' })]), 'we-squat'),
    ).toEqual({ outcome: 'tooLight' });
  });
});

describe('confirmApproachSets', () => {
  it('adds exactly the previewed sets, marked, before the working set (AC-3)', () => {
    const next = addRamp(squats140());
    const entries = entriesOf(next);

    expect(entries.map((entry) => [entry.type, entry.weightKg, entry.reps, entry.generatedWarmup])).toEqual([
      ['warmup', '20', '10', true],
      ['warmup', '55', '5', true],
      ['warmup', '85', '3', true],
      ['warmup', '105', '2', true],
      ['warmup', '125', '1', true],
      ['normal', '140', '5', undefined],
      ['normal', '140', '5', undefined],
    ]);
    expect(entries.map((entry) => entry.order)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(new Set(entries.map((entry) => entry.id)).size).toBe(7);
    expect(warmUpActionFor(next.exercises[0]!)).toBe('remove');
  });

  it('adds after existing warm-ups and removes none (FR-3, FR-4)', () => {
    const draft = draftWith([
      set({ id: 'own', type: 'warmup', weightKg: '20', reps: '15' }),
      set({ id: 'w-1', weightKg: '140', reps: '5' }),
    ]);

    const entries = entriesOf(addRamp(draft));

    expect(entries[0]!.id).toBe('own');
    expect(entries[0]!.generatedWarmup).toBeUndefined();
    expect(entries.slice(1, 6).every((entry) => entry.generatedWarmup)).toBe(true);
    expect(entries[6]!.id).toBe('w-1');
  });

  it('adds what was shown even if the working weight changed meanwhile (EF-2)', () => {
    const draft = squats140();
    const preview = previewOf(draft);
    const heavier = updateWorkoutSetDraft(draft, 'we-squat', 'w-1', 'weightKg', '200');

    const entries = entriesOf(confirmApproachSets(heavier, 'we-squat', preview));

    expect(entries.slice(0, 5).map((entry) => entry.weightKg)).toEqual(['20', '55', '85', '105', '125']);
  });

  it('adds nothing once the exercise is removed or replaced (EF-1)', () => {
    const draft = squats140();
    const preview = previewOf(draft);

    const removed = removeExerciseFromWorkout(draft, 'we-squat');
    expect(confirmApproachSets(removed, 'we-squat', preview)).toBe(removed);

    const replaced: WorkoutSessionDraft = {
      ...draft,
      exercises: [{ ...draft.exercises[0]!, exerciseId: 'ex-front-squat' }],
    };
    expect(confirmApproachSets(replaced, 'we-squat', preview)).toBe(replaced);
  });

  it('saves generated sets as plain warm-ups, without the mark (FR-17, AC-8)', () => {
    const input = toCreateWorkoutSessionInput(addRamp(squats140()));
    const first = input.exercises[0]!.sets[0]!;

    expect(first).toMatchObject({ type: 'warmup', isWarmup: true, weightKg: 20, reps: 10 });
    expect(first).not.toHaveProperty('generatedWarmup');
    expect(input.exercises[0]!.sets[5]).toMatchObject({ type: 'normal', weightKg: 140 });
  });

  it('keeps the mark through a restart of the app (FR-16, AC-7)', () => {
    const restored = JSON.parse(JSON.stringify(addRamp(squats140()))) as WorkoutSessionDraft;

    expect(entriesOf(restored).filter((entry) => entry.generatedWarmup)).toHaveLength(5);
    expect(warmUpActionFor(restored.exercises[0]!)).toBe('remove');
  });
});

describe('removeGeneratedWarmUps', () => {
  it('removes the generated sets and keeps the person\'s own (FR-9, FR-10, AC-4)', () => {
    const draft = draftWith([
      set({ id: 'own', type: 'warmup', weightKg: '20', reps: '15' }),
      set({ id: 'w-1', weightKg: '140', reps: '5' }),
    ]);

    const next = removeGeneratedWarmUps(addRamp(draft), 'we-squat');

    expect(entriesOf(next).map((entry) => [entry.id, entry.order])).toEqual([
      ['own', 1],
      ['w-1', 2],
    ]);
    expect(warmUpActionFor(next.exercises[0]!)).toBe('add');
  });

  it('keeps generated sets that are done, still marked (AC-5, EF-3)', () => {
    let draft = addRamp(squats140());
    const [first, second] = entriesOf(draft);
    draft = toggleWorkoutSetDone(draft, 'we-squat', first!.id);
    draft = toggleWorkoutSetDone(draft, 'we-squat', second!.id);

    const next = removeGeneratedWarmUps(draft, 'we-squat');
    const entries = entriesOf(next);

    expect(entries.map((entry) => entry.id)).toEqual([first!.id, second!.id, 'w-1', 'w-2']);
    expect(entries.slice(0, 2).every((entry) => entry.generatedWarmup && entry.done)).toBe(true);
    // Only done generated sets left: the action adds again, the full ramp.
    expect(warmUpActionFor(next.exercises[0]!)).toBe('add');
    expect(previewOf(next)).toMatchObject({ keptWarmUps: 2 });
    expect(previewOf(next).sets).toHaveLength(5);
  });

  it('keeps a generated set the person changed, which loses its mark (FR-7, AC-6)', () => {
    let draft = addRamp(squats140());
    const third = entriesOf(draft)[2]!;
    draft = updateWorkoutSetDraft(draft, 'we-squat', third.id, 'weightKg', '80');

    expect(entriesOf(draft)[2]!.generatedWarmup).toBeUndefined();

    const entries = entriesOf(removeGeneratedWarmUps(draft, 'we-squat'));
    expect(entries.map((entry) => entry.id)).toEqual([third.id, 'w-1', 'w-2']);
    expect(entries[0]!.weightKg).toBe('80');
  });

  it('a re-typed generated set loses the mark; ticking it does not (FR-7)', () => {
    const draft = addRamp(squats140());
    const first = entriesOf(draft)[0]!;

    const retyped = cycleWorkoutSetType(draft, 'we-squat', first.id);
    expect(entriesOf(retyped)[0]!.generatedWarmup).toBeUndefined();

    const ticked = toggleWorkoutSetDone(draft, 'we-squat', first.id);
    expect(entriesOf(ticked)[0]!.generatedWarmup).toBe(true);

    const sameValue = updateWorkoutSetDraft(draft, 'we-squat', first.id, 'weightKg', '20');
    expect(entriesOf(sameValue)[0]!.generatedWarmup).toBe(true);

    const sideReps = updateWorkoutSetDraft(draft, 'we-squat', first.id, 'repsLeft', '8');
    expect(entriesOf(sideReps)[0]!.generatedWarmup).toBeUndefined();
  });

  it('works with every working set removed (EF-4) and keeps unmarked 0024 warm-ups (EF-6)', () => {
    const draft = draftWith([
      set({ id: 'legacy', type: 'warmup', weightKg: '60', reps: '5' }),
      set({ id: 'gen', type: 'warmup', weightKg: '85', reps: '3', generatedWarmup: true }),
    ]);

    expect(entriesOf(removeGeneratedWarmUps(draft, 'we-squat')).map((entry) => entry.id)).toEqual([
      'legacy',
    ]);
  });

  it('returns the same draft when there is nothing to remove', () => {
    const draft = squats140();
    expect(removeGeneratedWarmUps(draft, 'we-squat')).toBe(draft);
  });
});

describe('workout from a routine', () => {
  it('starts routine warm-up sets as warm-ups, keeping the generated mark', () => {
    const at = '2026-10-17T08:00:00.000Z';
    const draft = buildWorkoutSessionDraft({
      id: 'r1',
      userId: 'u1',
      name: 'Legs',
      exercises: [
        {
          id: 're-1',
          routineId: 'r1',
          exerciseId: 'ex-squat',
          exerciseName: 'Squat',
          orderIndex: 1,
          sets: [
            { id: 's0', routineExerciseId: 're-1', setNumber: 1, targetWeight: 20, isWarmup: true, createdAt: at, updatedAt: at },
            { id: 's1', routineExerciseId: 're-1', setNumber: 2, targetWeight: 55, isWarmup: true, isGeneratedWarmup: true, createdAt: at, updatedAt: at },
            { id: 's2', routineExerciseId: 're-1', setNumber: 3, targetWeight: 140, isGeneratedWarmup: true, createdAt: at, updatedAt: at },
          ],
          createdAt: at,
          updatedAt: at,
        },
      ],
      createdAt: at,
      updatedAt: at,
    });

    expect(entriesOf(draft).map((entry) => entry.type)).toEqual(['warmup', 'warmup', 'normal']);
    // Generated routine warm-ups are generated in the workout (spec 0031 FR-15,
    // AC-9); the mark means nothing on a working set.
    expect(entriesOf(draft).map((entry) => entry.generatedWarmup)).toEqual([
      undefined,
      true,
      undefined,
    ]);
    const removed = removeGeneratedWarmUps(draft, draft.exercises[0]!.id);
    expect(entriesOf(removed).map((entry) => entry.id)).toEqual([
      'draft-set-re-1-1',
      'draft-set-re-1-3',
    ]);
  });
});

describe('canAddApproachSets', () => {
  it('is offered for weight & reps exercises only', () => {
    expect(canAddApproachSets({})).toBe(true);
    expect(canAddApproachSets({ trackingType: 'weight_reps' })).toBe(true);
    expect(canAddApproachSets({ trackingType: 'reps' })).toBe(false);
    expect(canAddApproachSets({ trackingType: 'weight_duration' })).toBe(false);
  });
});
