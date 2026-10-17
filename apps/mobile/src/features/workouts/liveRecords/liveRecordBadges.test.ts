import type { ExerciseTrackingType, StartingRecords } from '@workout/domain';
import { describe, expect, it } from 'vitest';

import {
  cycleWorkoutSetType,
  removeExerciseFromWorkout,
  removeSetFromWorkoutExercise,
  toggleWorkoutSetDone,
  updateWorkoutSetDraft,
  type WorkoutSessionDraft,
  type WorkoutSetDraft,
} from '@/features/workouts/state/workoutDraftStore';

import { buildLiveRecordBadges, recordNotice } from './liveRecordBadges';

type SetInit = Partial<WorkoutSetDraft> & { id: string };

const set = ({ id, ...rest }: SetInit): WorkoutSetDraft => ({
  id,
  order: 1,
  reps: '',
  weightKg: '',
  done: false,
  type: 'normal',
  ...rest,
});

/** Bench: saved best 100 kg × 6 (e1RM 120, set volume 600), session 5,000 kg. */
const bench: StartingRecords = {
  exerciseId: 'bench',
  bests: {
    heaviestWeight: 100,
    mostReps: 12,
    bestSetVolume: 960,
    bestSessionVolume: 5000,
    bestEstimatedOneRepMax: 120,
  },
  repsAtWeight: [
    { weightKg: 100, reps: 6 },
    { weightKg: 80, reps: 12 },
  ],
};

function workout(
  sets: SetInit[],
  options: {
    starting?: Record<string, StartingRecords>;
    trackingType?: ExerciseTrackingType;
    isUnilateral?: boolean;
    exerciseId?: string;
    unit?: 'kg' | 'lb';
  } = {},
): WorkoutSessionDraft {
  const exerciseId = options.exerciseId ?? 'bench';
  return {
    id: 'w',
    clientId: 'c',
    routineId: 'r',
    routineName: 'Push',
    startedAt: '2026-10-17T09:00:00.000Z',
    unit: options.unit,
    startingRecords: options.starting ?? { bench },
    exercises: [
      {
        id: 'we-1',
        exerciseId,
        exerciseName: 'Bench press',
        trackingType: options.trackingType,
        isUnilateral: options.isUnilateral,
        order: 1,
        entries: sets.map(set),
      },
    ],
  };
}

const typesOf = (draft: WorkoutSessionDraft, setId: string) =>
  (buildLiveRecordBadges(draft).bySet[setId] ?? []).map((hit) => hit.type);

describe('buildLiveRecordBadges', () => {
  it('AC-1: 100 kg × 8 done beats most reps at 100 kg (first badge)', () => {
    const draft = workout([{ id: 's1', weightKg: '100', reps: '8', done: true }]);
    const hits = buildLiveRecordBadges(draft).bySet.s1!;

    expect(hits[0]).toEqual({ type: 'repsAtWeight', value: 8, weightKg: 100 });
    expect(hits.map((hit) => hit.type)).toEqual([
      'repsAtWeight',
      'bestEstimatedOneRepMax',
    ]);
  });

  it('AC-2: unmarking removes the badge', () => {
    const draft = workout([{ id: 's1', weightKg: '100', reps: '8', done: true }]);
    expect(typesOf(toggleWorkoutSetDone(draft, 'we-1', 's1'), 's1')).toEqual([]);
  });

  it('AC-3: editing a done set re-judges it, both ways', () => {
    const draft = workout([{ id: 's1', weightKg: '100', reps: '8', done: true }]);
    const six = updateWorkoutSetDraft(draft, 'we-1', 's1', 'reps', '6');
    expect(typesOf(six, 's1')).toEqual([]);
    expect(typesOf(updateWorkoutSetDraft(six, 'we-1', 's1', 'reps', '8'), 's1')).toContain(
      'repsAtWeight',
    );
  });

  it('AC-4: two sets beating the same starting record both keep it', () => {
    const draft = workout([
      { id: 's1', weightKg: '100', reps: '8', done: true },
      { id: 's2', weightKg: '100', reps: '9', done: true },
    ]);
    expect(typesOf(draft, 's1')).toContain('repsAtWeight');
    expect(typesOf(draft, 's2')).toContain('repsAtWeight');

    const secondUnmarked = toggleWorkoutSetDone(draft, 'we-1', 's2');
    expect(typesOf(secondUnmarked, 's1')).toContain('repsAtWeight');
    expect(typesOf(secondUnmarked, 's2')).toEqual([]);
  });

  it('AC-5: a heavy warm-up earns nothing until it is a working set', () => {
    const draft = workout([{ id: 's1', weightKg: '140', reps: '1', done: true, type: 'warmup' }]);
    expect(typesOf(draft, 's1')).toEqual([]);

    // warm-up → drop: a working set (FR-5).
    expect(typesOf(cycleWorkoutSetType(draft, 'we-1', 's1'), 's1')).toEqual([
      'heaviestWeight',
      'bestEstimatedOneRepMax',
    ]);
  });

  it('AC-6: session volume shows past 5,000 kg and goes at 5,000 or less', () => {
    const sets: SetInit[] = [
      { id: 's1', weightKg: '100', reps: '5', done: true },
      { id: 's2', weightKg: '100', reps: '5', done: true },
      { id: 's3', weightKg: '100', reps: '5', done: true },
      { id: 's4', weightKg: '100', reps: '5', done: true },
      { id: 's5', weightKg: '100', reps: '5', done: true },
      { id: 's6', weightKg: '100', reps: '5', done: true },
      { id: 's7', weightKg: '100', reps: '5', done: true },
      { id: 's8', weightKg: '100', reps: '5', done: true },
      { id: 's9', weightKg: '100', reps: '5', done: true },
      { id: 's10', weightKg: '100', reps: '5', done: true },
      { id: 's11', weightKg: '10', reps: '1', done: true },
    ];
    const draft = workout(sets);
    expect(buildLiveRecordBadges(draft).sessionVolumeByExercise.bench).toEqual({
      type: 'bestSessionVolume',
      value: 5010,
    });

    const back = toggleWorkoutSetDone(draft, 'we-1', 's11');
    expect(buildLiveRecordBadges(back).sessionVolumeByExercise.bench).toBeUndefined();
  });

  it('session volume counts both entries of the same exercise, warm-ups never', () => {
    const draft = workout([{ id: 's1', weightKg: '100', reps: '30', done: true }]);
    const twice: WorkoutSessionDraft = {
      ...draft,
      exercises: [
        ...draft.exercises,
        {
          id: 'we-2',
          exerciseId: 'bench',
          exerciseName: 'Bench press',
          order: 2,
          entries: [
            set({ id: 's2', weightKg: '100', reps: '30', done: true, type: 'warmup' }),
            set({ id: 's3', weightKg: '100', reps: '21', done: true }),
          ],
        },
      ],
    };

    expect(buildLiveRecordBadges(twice).sessionVolumeByExercise.bench?.value).toBe(5100);
    expect(
      buildLiveRecordBadges(removeExerciseFromWorkout(twice, 'we-2')).sessionVolumeByExercise
        .bench,
    ).toBeUndefined();
  });

  it('AC-7: an exercise never performed earns nothing', () => {
    const empty: StartingRecords = { exerciseId: 'bench', bests: {}, repsAtWeight: [] };
    const draft = workout([{ id: 's1', weightKg: '200', reps: '20', done: true }], {
      starting: { bench: empty },
    });
    expect(buildLiveRecordBadges(draft)).toEqual({ bySet: {}, sessionVolumeByExercise: {} });
  });

  it('EF-1 / AC-9: no starting records loaded, no badge at all', () => {
    const draft = workout([{ id: 's1', weightKg: '200', reps: '20', done: true }], {
      starting: {},
    });
    expect(buildLiveRecordBadges(draft)).toEqual({ bySet: {}, sessionVolumeByExercise: {} });
  });

  it('FR-19: deleting a set removes its badge', () => {
    const draft = workout([{ id: 's1', weightKg: '100', reps: '8', done: true }]);
    expect(buildLiveRecordBadges(removeSetFromWorkoutExercise(draft, 'we-1', 's1')).bySet).toEqual(
      {},
    );
  });

  it('AC-12: a plank of 75 s beats a longest time of 60 s', () => {
    const plank: StartingRecords = {
      exerciseId: 'plank',
      bests: { longestTime: 60 },
      repsAtWeight: [],
    };
    const draft = workout([{ id: 's1', duration: '1:15', done: true }], {
      exerciseId: 'plank',
      trackingType: 'duration',
      starting: { plank },
    });
    expect(buildLiveRecordBadges(draft).bySet.s1).toEqual([
      { type: 'longestTime', value: 75, weightKg: undefined, reps: undefined },
    ]);
  });

  it('weight & time: the weight is never a weight record (FR-9)', () => {
    const carry: StartingRecords = {
      exerciseId: 'carry',
      bests: { longestTime: 60, heaviestWeight: 10 },
      repsAtWeight: [],
    };
    const draft = workout([{ id: 's1', weightKg: '40', duration: '30', done: true }], {
      exerciseId: 'carry',
      trackingType: 'weight_duration',
      starting: { carry },
    });
    expect(typesOf(draft, 's1')).toEqual([]);
  });

  it('AC-13: 11 L / 8 R at 20 kg beats most reps at 20 kg of 10 (better side)', () => {
    const squat: StartingRecords = {
      exerciseId: 'split',
      bests: { mostReps: 10 },
      repsAtWeight: [{ weightKg: 20, reps: 10 }],
    };
    const draft = workout([{ id: 's1', weightKg: '20', repsLeft: '11', repsRight: '8', done: true }], {
      exerciseId: 'split',
      isUnilateral: true,
      starting: { split: squat },
    });
    expect(typesOf(draft, 's1')).toEqual(['mostReps', 'repsAtWeight']);
  });

  it('AC-14: an unedited ghosted placeholder is judged as it would be saved', () => {
    const draft = workout([
      { id: 's1', weightKg: '100', repsPlaceholder: '8', done: true },
    ]);
    expect(typesOf(draft, 's1')).toContain('repsAtWeight');
  });

  it('EF-7: pounds compare on the kilograms saved, not the rounded display', () => {
    // 220.5 lb = 100.02 kg, saved as 100.0: not heavier than 100 kg.
    const same = workout([{ id: 's1', weightKg: '220.5', reps: '1', done: true }], { unit: 'lb' });
    expect(typesOf(same, 's1')).not.toContain('heaviestWeight');

    const heavier = workout([{ id: 's1', weightKg: '221', reps: '1', done: true }], { unit: 'lb' });
    expect(typesOf(heavier, 's1')).toContain('heaviestWeight');
  });

  it('EF-6: a set with no values earns nothing', () => {
    expect(typesOf(workout([{ id: 's1', done: true }]), 's1')).toEqual([]);
  });

  it('EF-8: a changed tracking type is judged by the new one', () => {
    const draft = workout([{ id: 's1', weightKg: '140', reps: '13', done: true }]);
    const repsOnly: WorkoutSessionDraft = {
      ...draft,
      exercises: draft.exercises.map((exercise) => ({ ...exercise, trackingType: 'reps' })),
    };
    expect(typesOf(repsOnly, 's1')).toEqual(['mostReps']);
  });
});

describe('recordNotice', () => {
  const before = workout([{ id: 's1', weightKg: '100', reps: '8' }]);
  const marked = toggleWorkoutSetDone(before, 'we-1', 's1');

  it('AC-1: marking a record-beating set done gives a notice', () => {
    expect(recordNotice(before, marked)).toMatchObject({
      workoutSetId: 's1',
      exerciseName: 'Bench press',
      hits: [{ type: 'repsAtWeight', value: 8, weightKg: 100 }, { type: 'bestEstimatedOneRepMax' }],
    });
  });

  it('AC-2: unmarking gives none', () => {
    expect(recordNotice(marked, toggleWorkoutSetDone(marked, 'we-1', 's1'))).toBeUndefined();
  });

  it('AC-3: editing a done set into a record gives none', () => {
    const six = updateWorkoutSetDraft(marked, 'we-1', 's1', 'reps', '6');
    expect(recordNotice(six, updateWorkoutSetDraft(six, 'we-1', 's1', 'reps', '8'))).toBeUndefined();
  });

  it('EF-2: records arriving after the set was done give none', () => {
    const notLoaded = { ...marked, startingRecords: {} };
    expect(recordNotice(notLoaded, marked)).toBeUndefined();
  });

  it('marking a set that beats nothing gives none', () => {
    const light = workout([{ id: 's1', weightKg: '50', reps: '5' }]);
    expect(recordNotice(light, toggleWorkoutSetDone(light, 'we-1', 's1'))).toBeUndefined();
  });

  it('the first draft seen gives none', () => {
    expect(recordNotice(null, marked)).toBeUndefined();
  });
});
