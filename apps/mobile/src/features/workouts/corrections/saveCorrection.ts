import type { UpdateWorkoutSessionInput, WorkoutSession } from '@workout/domain';
import { correctionPayload } from './correctionDraft';
import { correctionStore } from './correctionStore';
import { invalidateSavedWorkout } from './workoutInvalidation';
/** Locks one owned draft and retains the exact mutation across uncertain retries. */
export async function saveCorrection(ownerId: string, workoutId: string, {
  send, stillOwned, newId, classify,
}: {
  send: (input: UpdateWorkoutSessionInput) => Promise<WorkoutSession>;
  stillOwned: () => boolean;
  newId: () => string;
  classify: (error: unknown) => 'conflict' | 'unavailable' | 'inaccessible';
}): Promise<boolean> {
  const entry = correctionStore.get(ownerId, workoutId);
  if (!entry || entry.saving || !stillOwned()) return false;
  let input: UpdateWorkoutSessionInput;
  try { input = correctionPayload(entry.draft, 'pending'); }
  catch (error) {
    const code = error instanceof Error && ['invalid', 'noPerformed', 'unsupported'].includes(error.message) ? error.message as 'invalid' | 'noPerformed' | 'unsupported' : 'invalid';
    correctionStore.set(ownerId, workoutId, { ...entry, error: code }); return false;
  }
  const fingerprint = JSON.stringify(input);
  const mutationId = entry.submission?.fingerprint === fingerprint ? entry.submission.mutationId : newId();
  correctionStore.set(ownerId, workoutId, { ...entry, saving: true, error: undefined, submission: { fingerprint, mutationId } });
  try {
    const saved = await send({ ...input, mutationId });
    if (saved.id !== workoutId || saved.userId !== ownerId || saved.revision !== input.expectedRevision + 1) throw new Error('Invalid correction response');
    if (!stillOwned()) return false;
    correctionStore.remove(ownerId, workoutId);
    invalidateSavedWorkout({ ownerId, workoutId, exerciseIds: entry.draft.original.exercises.map((exercise) => exercise.exerciseId) });
    return true;
  } catch (error) {
    const current = correctionStore.get(ownerId, workoutId);
    if (current) correctionStore.set(ownerId, workoutId, { ...current, error: classify(error) });
    return false;
  } finally {
    const current = correctionStore.get(ownerId, workoutId);
    if (current?.saving) correctionStore.set(ownerId, workoutId, { ...current, saving: false });
  }
}
