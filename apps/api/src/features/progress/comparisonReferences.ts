import { recordsFromSets, type ExerciseComparisonReference } from '@workout/domain';
import { buildStartingRecords } from './startingRecords.js';
import { selectPerformedWork, type ProgressSessionInput } from './aggregate.js';

export function buildComparisonReferences(
  inputs: ProgressSessionInput[], ids: string[], before: string, visibleIds: Set<string>,
): ExerciseComparisonReference[] {
  const sessions = selectPerformedWork(inputs).filter((s) => Date.parse(s.startedAt ?? s.date) < Date.parse(before));
  const historical = buildStartingRecords(sessions, ids);
  return ids.map((exerciseId, index) => {
    if (!visibleIds.has(exerciseId)) return { exerciseId, historical: { status: 'unavailable' }, lastSession: { status: 'unavailable' } };
    const prior = sessions.filter((s) => s.exercises.some((e) => e.exerciseId === exerciseId))
      .sort((a, b) => (b.startedAt ?? b.date).localeCompare(a.startedAt ?? a.date) || b.date.localeCompare(a.date) || (b.workoutId ?? '').localeCompare(a.workoutId ?? ''))[0];
    const sets = prior?.exercises.filter((e) => e.exerciseId === exerciseId).flatMap((e) => e.sets)
      .filter((set) => set.type !== 'warmup' && !set.isWarmup) ?? [];
    return { exerciseId, historical: { status: 'ready', value: historical[index]! },
      lastSession: { status: 'ready', value: prior && prior.workoutId ? {
        sessionId: prior.workoutId, date: prior.startedAt ?? prior.date,
        records: recordsFromSets(exerciseId, sets),
      } : null } };
  });
}
