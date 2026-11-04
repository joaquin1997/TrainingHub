import { describe, expect, it } from 'vitest';
import type { ExerciseProgressSummary } from '@workout/domain';
import { searchTrainedExercises } from './exerciseSearch';
const exercise = (id: string, name: string, date: string, searchNames: string[] = []): ExerciseProgressSummary => ({
  exerciseId: id, exerciseName: name, lastPerformedAt: date, searchNames, sessionCount: 2, isRecordSession: false,
});
const data = [exercise('s', 'Sentadilla', '2026-11-01'), exercise('b', 'Press de banca', '2026-11-02', ['Bánca', 'Bench press'])];
describe('search trained exercises', () => {
  it.each(['  BANCA  ', 'bánca', 'BENCH PRESS'])('matches localized/alternate names once for %s', (query) => {
    expect(searchTrainedExercises(data, query, 'es').map((e) => e.exerciseId)).toEqual(['b']);
  });
  it('orders recent first, then localized name and ID', () => {
    expect(searchTrainedExercises(data, '', 'es').map((e) => e.exerciseId)).toEqual(['b', 's']);
    expect(searchTrainedExercises([exercise('z', 'Zeta', '2026-11-01'), exercise('a', 'Ábaco', '2026-11-01')], '', 'es')
      .map((e) => e.exerciseId)).toEqual(['a', 'z']);
  });
  it('does not substitute the catalog or unrelated results for no matches', () => {
    expect(searchTrainedExercises(data, 'missing', 'en')).toEqual([]);
  });
});
