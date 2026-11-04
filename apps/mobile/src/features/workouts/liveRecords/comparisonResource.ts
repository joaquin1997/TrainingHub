import type { ExerciseComparisonReference, LastSessionReference } from '@workout/domain';
import { isLastSessionReference, isStartingRecords } from '@workout/domain/records';
import type { WorkoutSessionDraft } from '../state/workoutDraftStore';
import { startingRecordsFor, withStartingRecords } from './startingRecordsDraft';

export type ComparisonLoadState = 'loading' | 'offline' | 'unavailable' | 'refused';
export type ComparisonLoadStates = Record<string, Partial<Record<'historical' | 'lastSession', ComparisonLoadState>>>;
export function lastSessionFor(draft: WorkoutSessionDraft, id: string): LastSessionReference | null | undefined {
  const value = draft.lastSessionReferences?.[id];
  return isLastSessionReference(value, id, draft.startedAt) ? value : undefined;
}
export function withComparisonReferences(draft: WorkoutSessionDraft, references: ExerciseComparisonReference[]): WorkoutSessionDraft {
  let next = draft;
  for (const reference of references) {
    const id = reference?.exerciseId;
    if (!draft.exercises.some((exercise) => exercise.exerciseId === id)) continue;
    if (reference.historical?.status === 'ready' && isStartingRecords(reference.historical.value, id)) {
      next = withStartingRecords(next, [reference.historical.value]);
    }
    if (lastSessionFor(next, id) === undefined && reference.lastSession?.status === 'ready' &&
        isLastSessionReference(reference.lastSession.value, id, draft.startedAt)) {
      next = { ...next, lastSessionReferences: { ...next.lastSessionReferences, [id]: reference.lastSession.value } };
    }
  }
  return next;
}

/** One mounted workout/account scope; missing sources retry, successes stay frozen. */
export function createComparisonResource({ get, set, list, changed, classify }: {
  get: () => WorkoutSessionDraft | null;
  set: (draft: WorkoutSessionDraft) => void;
  list: (ids: string[], before: string) => Promise<ExerciseComparisonReference[]>;
  changed: (states: ComparisonLoadStates) => void;
  classify: (error: unknown) => ComparisonLoadState;
}) {
  const clientId = get()?.clientId;
  let active = true;
  let inFlight = false;
  let states: ComparisonLoadStates = {};
  const current = () => { const draft = get(); return active && draft?.clientId === clientId ? draft : null; };
  const missing = (draft: WorkoutSessionDraft, id: string) => ({
    historical: !startingRecordsFor(draft, id), lastSession: lastSessionFor(draft, id) === undefined,
  });
  const publish = (ids: string[], state: ComparisonLoadState) => {
    const draft = current();
    if (!draft) return;
    states = { ...states };
    for (const id of ids) {
      if (!draft.exercises.some((exercise) => exercise.exerciseId === id)) continue;
      const absent = missing(draft, id);
      states[id] = {};
      for (const source of ['historical', 'lastSession'] as const) if (absent[source]) states[id]![source] = state;
    }
    changed(states);
  };
  return {
    async load(manual = false) {
      const draft = current();
      if (!draft || inFlight) return;
      const ids = [...new Set(draft.exercises.map((exercise) => exercise.exerciseId))].filter((id) => {
        const absent = missing(draft, id);
        return (['historical', 'lastSession'] as const).some((source) => absent[source] && (manual || states[id]?.[source] !== 'refused'));
      });
      if (!ids.length) return;
      inFlight = true;
      publish(ids, 'loading');
      try {
        for (let index = 0; index < ids.length; index += 50) {
          const batch = ids.slice(index, index + 50);
          try {
            const references = await list(batch, draft.startedAt);
            const latest = current();
            if (!latest) return;
            if (!Array.isArray(references)) throw new Error('Invalid comparison response');
            const allowed = references.filter((reference) => reference && batch.includes(reference.exerciseId));
            const next = withComparisonReferences(latest, allowed);
            if (next !== latest) set(next);
            publish(batch, 'unavailable');
            // Explicit inaccessible sources retry on manual request or reopen, not a loop.
            for (const reference of allowed) {
              for (const source of ['historical', 'lastSession'] as const) {
                if (reference[source]?.status === 'unavailable' && states[reference.exerciseId]?.[source]) states[reference.exerciseId]![source] = 'refused';
              }
            }
            changed({ ...states });
          } catch (error) { publish(batch, classify(error)); }
        }
      } finally { inFlight = false; }
    },
    stop() { active = false; },
  };
}
