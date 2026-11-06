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

/** Strict ISO instant; reject calendar overflow instead of silently shifting dates. */
export function parseComparisonBefore(value: unknown): string | null {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(value)) return null;
  const date = new Date(value);
  const calendar = new Date(value.slice(0, 10) + 'T00:00:00Z');
  if (!Number.isFinite(date.getTime()) || !Number.isFinite(calendar.getTime()) || calendar.toISOString().slice(0, 10) !== value.slice(0, 10) || Number(value.slice(11, 13)) > 23) return null;
  return date.toISOString();
}
