import type { WorkoutSession, WorkoutSet } from '@workout/domain';
import { describe, expect, it } from 'vitest';

import i18n from 'i18next';

import { en } from '@/i18n/locales/en';
import { es } from '@/i18n/locales/es';

import {
  compareWithPrevious,
  describeComparison,
  loadWorkoutComparison,
  type ComparedWorkout,
} from './workoutComparison';

type SetValues = Partial<Pick<WorkoutSet, 'reps' | 'weightKg' | 'type' | 'performed' | 'completedAt'>>;

const stamp = '2026-10-01T00:00:00.000Z';

function saved(
  id: string,
  startedAt: string,
  exercises: { exerciseId: string; sets: SetValues[] }[],
  extra: Partial<WorkoutSession> = {},
): WorkoutSession {
  return {
    id,
    userId: 'user',
    status: 'completed',
    startedAt,
    completedAt: startedAt,
    createdAt: stamp,
    updatedAt: stamp,
    ...extra,
    exercises: exercises.map((exercise, index) => ({
      id: `${id}-e${index}`,
      workoutSessionId: id,
      exerciseId: exercise.exerciseId,
      exerciseName: exercise.exerciseId,
      order: index + 1,
      createdAt: stamp,
      updatedAt: stamp,
      sets: exercise.sets.map((set, setIndex) => ({
        id: `${id}-e${index}-s${setIndex}`,
        workoutExerciseId: `${id}-e${index}`,
        order: setIndex + 1,
        type: 'normal',
        performed: true,
        createdAt: stamp,
        updatedAt: stamp,
        ...set,
      })),
    })),
  };
}

const today: ComparedWorkout = {
  routineId: 'torso',
  startedAt: '2026-10-15T18:00:00.000Z',
  exercises: [
    { exerciseId: 'bench', sets: [{ weightKg: 100, reps: 10, performed: true }] },
    { exerciseId: 'row', sets: [{ weightKg: 50, reps: 10, performed: true }] },
  ],
};

// Volume today: 1000 (bench) + 500 (row) = 1500 kg.
const justSaved = saved('today', today.startedAt, [
  { exerciseId: 'bench', sets: [{ weightKg: 100, reps: 10 }] },
  { exerciseId: 'row', sets: [{ weightKg: 50, reps: 10 }] },
], { routineId: 'torso' });

describe('compareWithPrevious', () => {
  it('compares with the previous workout of the same routine, never with itself (AC-17)', () => {
    const history = [
      justSaved,
      saved('older', '2026-10-05T18:00:00.000Z', [
        { exerciseId: 'bench', sets: [{ weightKg: 50, reps: 10 }] },
      ], { routineId: 'torso' }),
      saved('previous', '2026-10-12T18:00:00.000Z', [
        { exerciseId: 'bench', sets: [{ weightKg: 90, reps: 10 }] },
        { exerciseId: 'row', sets: [{ weightKg: 40, reps: 10 }] },
      ], { routineId: 'torso' }),
      // A later workout of another routine does not count for the routine.
      saved('legs', '2026-10-14T18:00:00.000Z', [
        { exerciseId: 'squat', sets: [{ weightKg: 100, reps: 5 }] },
      ], { routineId: 'legs' }),
    ];

    const result = compareWithPrevious(today, history, 'kg');

    expect(result.routine).toEqual({
      deltaKg: 200,
      direction: 'up',
      previousDate: '2026-10-12T18:00:00.000Z',
    });
    expect(result.exercises.bench).toEqual({
      deltaKg: 100,
      direction: 'up',
      previousDate: '2026-10-12T18:00:00.000Z',
    });
    expect(result.exercises.row?.deltaKg).toBe(100);
  });

  it('has no routine comparison on the routine’s first workout', () => {
    const result = compareWithPrevious(today, [justSaved], 'kg');

    expect(result.routine).toBeNull();
    expect(result.exercises).toEqual({ bench: null, row: null });
  });

  it('compares per exercise only when the routine link is lost', () => {
    const history = [
      justSaved,
      saved('other', '2026-10-10T18:00:00.000Z', [
        { exerciseId: 'bench', sets: [{ weightKg: 100, reps: 12 }] },
      ], { routineId: 'torso' }),
    ];

    const result = compareWithPrevious({ ...today, routineId: undefined }, history, 'kg');

    expect(result.routine).toBeNull();
    expect(result.exercises.bench).toMatchObject({ deltaKg: -200, direction: 'down' });
  });

  it('takes each exercise’s last session from any routine', () => {
    const history = [
      saved('torso-old', '2026-10-01T18:00:00.000Z', [
        { exerciseId: 'bench', sets: [{ weightKg: 60, reps: 10 }] },
      ], { routineId: 'torso' }),
      saved('push', '2026-10-13T18:00:00.000Z', [
        { exerciseId: 'bench', sets: [{ weightKg: 80, reps: 10 }] },
      ], { routineId: 'push' }),
    ];

    const result = compareWithPrevious(today, history, 'kg');

    expect(result.exercises.bench).toMatchObject({
      deltaKg: 200,
      previousDate: '2026-10-13T18:00:00.000Z',
    });
    expect(result.routine?.previousDate).toBe('2026-10-01T18:00:00.000Z');
  });

  it('is "same" when the difference rounds to 0 in the display unit', () => {
    const history = [
      saved('previous', '2026-10-12T18:00:00.000Z', [
        { exerciseId: 'bench', sets: [{ weightKg: 100, reps: 10 }] },
        { exerciseId: 'row', sets: [{ weightKg: 50, reps: 10 }] },
      ], { routineId: 'torso' }),
    ];

    const result = compareWithPrevious(today, history, 'lb');

    expect(result.routine).toMatchObject({ deltaKg: 0, direction: 'same' });
    expect(result.exercises.bench?.direction).toBe('same');
  });

  it('has no comparison for an exercise new today, or one whose last volume was 0', () => {
    const history = [
      saved('previous', '2026-10-12T18:00:00.000Z', [
        // Reps-only last time: nothing to compare with.
        { exerciseId: 'row', sets: [{ reps: 15 }] },
      ], { routineId: 'torso' }),
    ];

    const result = compareWithPrevious(today, history, 'kg');

    expect(result.exercises.bench).toBeNull();
    expect(result.exercises.row).toBeNull();
    expect(result.routine).toBeNull();
  });

  it('counts warm-ups as the summary does, and skips sets not performed', () => {
    const current: ComparedWorkout = {
      routineId: 'torso',
      startedAt: today.startedAt,
      exercises: [
        {
          exerciseId: 'bench',
          sets: [
            { weightKg: 40, reps: 10, performed: true }, // warm-up: counts (400)
            { weightKg: 100, reps: 10, performed: true },
            { weightKg: 100, reps: 10, performed: false },
          ],
        },
      ],
    };
    const history = [
      saved('previous', '2026-10-12T18:00:00.000Z', [
        {
          exerciseId: 'bench',
          sets: [
            { weightKg: 40, reps: 10, type: 'warmup' },
            { weightKg: 100, reps: 10 },
          ],
        },
      ], { routineId: 'torso' }),
    ];

    expect(compareWithPrevious(current, history, 'kg').routine?.direction).toBe('same');
  });

  it('sums an exercise logged twice in one workout', () => {
    const current: ComparedWorkout = {
      startedAt: today.startedAt,
      exercises: [
        { exerciseId: 'bench', sets: [{ weightKg: 100, reps: 5, performed: true }] },
        { exerciseId: 'bench', sets: [{ weightKg: 100, reps: 5, performed: true }] },
      ],
    };
    const history = [
      saved('previous', '2026-10-12T18:00:00.000Z', [
        { exerciseId: 'bench', sets: [{ weightKg: 100, reps: 8 }] },
      ]),
    ];

    expect(compareWithPrevious(current, history, 'kg').exercises.bench?.deltaKg).toBe(200);
  });

  it('reads legacy sessions without `performed` by their completion stamp', () => {
    const history = [
      saved('legacy', '2026-10-12T18:00:00.000Z', [
        {
          exerciseId: 'bench',
          sets: [
            { weightKg: 100, reps: 5, performed: undefined, completedAt: stamp },
            { weightKg: 100, reps: 5, performed: undefined },
          ],
        },
      ], { routineId: 'torso' }),
    ];

    expect(compareWithPrevious(today, history, 'kg').exercises.bench?.deltaKg).toBe(500);
  });

  it('ignores cancelled sessions', () => {
    const history = [
      saved('cancelled', '2026-10-12T18:00:00.000Z', [
        { exerciseId: 'bench', sets: [{ weightKg: 100, reps: 5 }] },
      ], { routineId: 'torso', status: 'cancelled' }),
    ];

    expect(compareWithPrevious(today, history, 'kg')).toEqual({
      routine: null,
      exercises: { bench: null, row: null },
    });
  });
});

describe('loadWorkoutComparison', () => {
  it('compares what the list returns', async () => {
    const result = await loadWorkoutComparison(today, 'kg', async () => [justSaved]);
    expect(result).toEqual({ routine: null, exercises: { bench: null, row: null } });
  });

  it('gives null when the history cannot be loaded (EF-5)', async () => {
    const result = await loadWorkoutComparison(today, 'kg', () =>
      Promise.reject(new Error('offline')),
    );
    expect(result).toBeNull();
  });

  it('gives null on an unexpected payload', async () => {
    const result = await loadWorkoutComparison(
      today,
      'kg',
      async () => ({ error: 'old server' }) as unknown as WorkoutSession[],
    );
    expect(result).toBeNull();
  });
});

describe('describeComparison', () => {
  const translator = i18n.createInstance();
  void translator.init({
    resources: { en: { translation: en }, es: { translation: es } },
    lng: 'en',
    interpolation: { escapeValue: false },
    initAsync: false,
  });
  const date = '2026-10-12T18:00:00.000Z';

  it('says the difference and the day, with a short chip label (AC-17)', () => {
    const words = describeComparison(
      { deltaKg: 1250, direction: 'up', previousDate: date },
      'kg',
      'en',
      translator.getFixedT('en'),
    );
    expect(words).toEqual({
      sentence: '1250 kg more than Oct 12',
      caption: '+1250 kg vs Oct 12',
      short: '+1250 kg',
    });
  });

  it('uses the display unit and the language; down and same have their words', () => {
    const t = translator.getFixedT('es');
    expect(
      describeComparison({ deltaKg: -100, direction: 'down', previousDate: date }, 'lb', 'es', t),
    ).toEqual({
      sentence: '220.5 lb menos que el 12 oct',
      caption: '−220.5 lb vs. 12 oct',
      short: '−220.5 lb',
    });
    expect(
      describeComparison({ deltaKg: 0, direction: 'same', previousDate: date }, 'kg', 'es', t),
    ).toEqual({
      sentence: 'Igual que el 12 oct',
      caption: 'Igual que el 12 oct',
      short: 'Igual',
    });
  });
});
