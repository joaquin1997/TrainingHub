import type { SessionRecord, WorkoutExercise } from '@workout/domain';
import { RECORD_TYPE_ORDER } from '@workout/domain/records';

/** Only historical records belong in a PR group; last-session feedback stays separate. */
export type SummaryRecord = SessionRecord & { baselineScope?: 'historical' | 'lastSession' };
export interface SessionRecordGroup {
  exerciseId: string;
  exerciseName: string;
  records: SessionRecord[];
}

/** First saved occurrence orders each identity; unknown identities retain encounter order. */
export function groupSessionRecords(
  records: readonly SummaryRecord[],
  savedExercises: ReadonlyArray<Pick<WorkoutExercise, 'exerciseId' | 'exerciseName' | 'order'>>,
): SessionRecordGroup[] {
  const order = new Map<string, { index: number; name: string }>();
  for (const exercise of [...savedExercises].sort((a, b) => a.order - b.order)) {
    if (!order.has(exercise.exerciseId)) order.set(exercise.exerciseId, { index: order.size, name: exercise.exerciseName });
  }
  const grouped = new Map<string, SessionRecordGroup>();
  for (const record of records) {
    if (record.baselineScope === 'lastSession') continue;
    let group = grouped.get(record.exerciseId);
    if (!group) {
      group = { exerciseId: record.exerciseId, exerciseName: order.get(record.exerciseId)?.name || record.exerciseName, records: [] };
      grouped.set(record.exerciseId, group);
    }
    group.records.push(record);
  }
  const groups = [...grouped.values()];
  for (const group of groups) {
    group.records.sort((a, b) => RECORD_TYPE_ORDER.indexOf(a.type) - RECORD_TYPE_ORDER.indexOf(b.type) ||
      (Date.parse(b.date) - Date.parse(a.date) || 0));
  }
  // Array sort is stable; unknown IDs all share the trailing rank.
  return groups.sort((a, b) => (order.get(a.exerciseId)?.index ?? Infinity) - (order.get(b.exerciseId)?.index ?? Infinity) || 0);
}
export const groupedRecordCount = (groups: readonly SessionRecordGroup[]) => groups.reduce((sum, group) => sum + group.records.length, 0);
