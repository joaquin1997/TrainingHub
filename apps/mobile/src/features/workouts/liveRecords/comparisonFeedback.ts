import type { RecordComparisonHit, RecordSetValues } from '@workout/domain';
import { comparisonHits, sessionVolumeKg, setComparisonHits } from '@workout/domain/records';
import { setValuesToSave, type WorkoutSessionDraft } from '../state/workoutDraftStore';
import { startingRecordsFor } from './startingRecordsDraft';
import { lastSessionFor } from './comparisonResource';

export function buildComparisonFeedback(draft: WorkoutSessionDraft | null) {
  const bySet: Record<string, RecordComparisonHit[]> = {};
  const byExercise: Record<string, RecordComparisonHit[]> = {};
  if (!draft) return { bySet, byExercise };
  const setsByExercise = new Map<string, RecordSetValues[]>();
  for (const exercise of draft.exercises) {
    const historical = startingRecordsFor(draft, exercise.exerciseId);
    const last = lastSessionFor(draft, exercise.exerciseId);
    const sets = setsByExercise.get(exercise.exerciseId) ?? [];
    for (const set of exercise.entries) {
      if (!set.done || set.type === 'warmup') continue;
      const values = setValuesToSave(set, exercise.trackingType, draft.unit ?? 'kg', exercise.isUnilateral);
      sets.push(values);
      bySet[set.id] = setComparisonHits(values, historical, last);
    }
    setsByExercise.set(exercise.exerciseId, sets);
  }
  for (const [id, sets] of setsByExercise) {
    const value = sessionVolumeKg(sets);
    if (value !== undefined) byExercise[id] = comparisonHits([{ type: 'bestSessionVolume', value }], startingRecordsFor(draft, id), lastSessionFor(draft, id));
  }
  return { bySet, byExercise };
}
