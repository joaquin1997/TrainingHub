import { describe, expect, it } from 'vitest';

import { selectPerformedWork, type ProgressSessionInput } from './aggregate.js';
import { buildStartingRecords, parseExerciseIds } from './startingRecords.js';

const done = '2026-05-01T09:30:00.000Z';

function session(
  date: string,
  exercises: Array<{
    exerciseId: string;
    sets: ProgressSessionInput['exercises'][number]['sets'];
  }>,
): ProgressSessionInput {
  return {
    date,
    exercises: exercises.map((exercise) => ({ ...exercise, exerciseName: exercise.exerciseId })),
  };
}

describe('buildStartingRecords', () => {
  const sessions = selectPerformedWork([
    session('2026-05-01T09:00:00.000Z', [
      {
        exerciseId: 'bench',
        sets: [
          { weightKg: 140, reps: 5, completedAt: done, type: 'warmup' },
          { weightKg: 100, reps: 6, completedAt: done },
          { weightKg: 90, reps: 10, completedAt: done },
          { weightKg: 80, reps: 12, completedAt: done },
          // Not done: not performed work.
          { weightKg: 120, reps: 2 },
        ],
      },
    ]),
    session('2026-05-08T09:00:00.000Z', [
      { exerciseId: 'bench', sets: [{ weightKg: 70, reps: 15, completedAt: done }] },
      // The same exercise twice in one workout is one session.
      { exerciseId: 'bench', sets: [{ weightKg: 100, reps: 5, completedAt: done }] },
      { exerciseId: 'plank', sets: [{ durationSeconds: 60, completedAt: done }] },
    ]),
  ]);

  it('takes the bests from performed working sets, warm-ups and undone sets out', () => {
    const [bench] = buildStartingRecords(sessions, ['bench']);

    expect(bench).toMatchObject({
      exerciseId: 'bench',
      bests: {
        heaviestWeight: 100,
        mostReps: 15,
        bestSetVolume: 1050,
        bestSessionVolume: 2460,
        bestEstimatedOneRepMax: 120,
      },
    });
  });

  it('keeps most reps at every weight, not only the top three', () => {
    const [bench] = buildStartingRecords(sessions, ['bench']);

    expect(
      bench!.repsAtWeight.slice().sort((left, right) => right.weightKg - left.weightKg),
    ).toEqual([
      { weightKg: 100, reps: 6 },
      { weightKg: 90, reps: 10 },
      { weightKg: 80, reps: 12 },
      { weightKg: 70, reps: 15 },
    ]);
  });

  it('answers every id asked, in order; never performed is empty', () => {
    const records = buildStartingRecords(sessions, ['squat', 'plank']);

    expect(records).toEqual([
      { exerciseId: 'squat', bests: {}, repsAtWeight: [] },
      { exerciseId: 'plank', bests: { longestTime: 60 }, repsAtWeight: [] },
    ]);
  });
});

describe('parseExerciseIds', () => {
  it('reads distinct trimmed ids', () => {
    expect(parseExerciseIds(' a, b ,a')).toEqual(['a', 'b']);
  });

  it('refuses missing or empty', () => {
    expect(parseExerciseIds(undefined)).toBeNull();
    expect(parseExerciseIds(' , ')).toBeNull();
  });
});
