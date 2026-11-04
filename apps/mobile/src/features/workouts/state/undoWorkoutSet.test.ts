import { describe, expect, it } from 'vitest';

import { parsePersistedActiveWorkout, serializeActiveWorkout } from '../persistence/activeWorkoutEnvelope';
import { currentSetToDo } from '../restTimer/nextSetToDo';
import { completeSetInRounds } from '../superset/rounds';
import {
  adjustRest, completeSet, pauseWorkout, removeExerciseFromWorkout,
  removeSetFromWorkoutExercise, undoWorkoutSetDone, type WorkoutSessionDraft,
} from './workoutDraftStore';

const now = new Date('2026-11-04T10:00:00Z');
const workout = (superset = false): WorkoutSessionDraft => ({
  id: 'w', clientId: 'c', routineId: 'r', routineName: 'Workout', startedAt: now.toISOString(),
  exercises: ['a', 'b', 'c'].map((id, index) => ({
    id, exerciseId: `ex-${id}`, exerciseName: id, order: index + 1, restSeconds: 90,
    supersetGroup: superset && index < 2 ? 1 : undefined,
    entries: [1, 2, 3].map((order) => ({
      id: `${id}${order}`, order, reps: '13', weightKg: '', weightPlaceholder: '180',
      done: false, type: 'normal',
    })),
  })),
});
const read = (draft: WorkoutSessionDraft) => {
  const result = parsePersistedActiveWorkout(serializeActiveWorkout(draft, 'owner'), 'owner');
  if (result.kind !== 'ok') throw new Error('Draft not restored');
  return result.draft;
};

describe('exact undo selection and rest origin (0046)', () => {
  it('selects an earlier third set exactly, retaining typed and suggested values across restart', () => {
    let draft = completeSetInRounds(workout(), 'a', 'a3', 90, now);
    draft = completeSetInRounds(draft, 'c', 'c1', 90, now);
    const rest = draft.rest;
    draft = read(undoWorkoutSetDone(draft, 'a', 'a3'));
    expect(currentSetToDo(draft)).toEqual({ workoutExerciseId: 'a', workoutSetId: 'a3' });
    expect(draft.rest).toEqual(rest);
    expect(draft.exercises[0]!.entries[2]).toMatchObject({
      reps: '13', weightKg: '', weightPlaceholder: '180', done: false,
    });
  });

  it('latest undo wins; re-completion clears it and resumes ordinary selection', () => {
    let draft = completeSetInRounds(workout(), 'a', 'a3', 90, now);
    draft = completeSetInRounds(draft, 'b', 'b2', 90, now);
    draft = undoWorkoutSetDone(undoWorkoutSetDone(draft, 'a', 'a3'), 'b', 'b2');
    expect(currentSetToDo(draft)?.workoutSetId).toBe('b2');
    draft = completeSetInRounds(draft, 'b', 'b2', 90, now);
    expect(draft.undoSelection).toBeUndefined();
    expect(currentSetToDo(draft)?.workoutSetId).toBe('b1');
  });

  it('removal of selected set/exercise and stale selections fall back to normal order', () => {
    const draft = undoWorkoutSetDone(completeSet(workout(), 'a', 'a3', 90, now), 'a', 'a3');
    const noSet = removeSetFromWorkoutExercise(draft, 'a', 'a3');
    expect(noSet.undoSelection).toBeUndefined();
    expect(currentSetToDo(noSet)?.workoutSetId).toBe('a1');
    expect(removeExerciseFromWorkout(draft, 'a').undoSelection).toBeUndefined();
    expect(currentSetToDo({ ...noSet, undoSelection: draft.undoSelection })?.workoutSetId).toBe('a1');
  });

  it('cancels only its own completion even after rest adjustment or workout pause', () => {
    const completed = completeSet(workout(), 'a', 'a1', 90, now);
    const adjusted = pauseWorkout(adjustRest(completed, 15, now), now);
    expect(adjusted.rest?.id).toBe(completed.rest?.id);
    expect(adjusted.rest?.originCompletionId).toBe(completed.exercises[0]!.entries[0]!.completionId);
    expect(undoWorkoutSetDone(read(adjusted), 'a', 'a1').rest).toBeUndefined();
  });

  it('preserves another set’s rest within the same exercise and never guesses legacy origin', () => {
    let draft = completeSet(workout(), 'a', 'a1', 90, now);
    draft = completeSet(draft, 'a', 'a2', 90, now);
    expect(undoWorkoutSetDone(draft, 'a', 'a1').rest).toBe(draft.rest);
    const { originSetId, originExerciseId, originCompletionId, ...legacy } = draft.rest!;
    expect(undoWorkoutSetDone({ ...draft, rest: legacy }, 'a', 'a2').rest).toBe(legacy);
  });

  it('replayed undo cannot cancel a later completion/rest of the same set', () => {
    const completed = completeSet(workout(), 'a', 'a1', 90, now);
    const token = completed.exercises[0]!.entries[0]!.completionId!;
    const undone = undoWorkoutSetDone(completed, 'a', 'a1', token);
    expect(undoWorkoutSetDone(undone, 'a', 'a1', token)).toBe(undone);
    const reticked = completeSet(read(undone), 'a', 'a1', 90, now);
    expect(reticked.rest?.id).not.toBe(completed.rest?.id);
    expect(reticked.rest?.originCompletionId).not.toBe(token);
    expect(undoWorkoutSetDone(reticked, 'a', 'a1', token)).toBe(reticked);
  });

  it('attributes a superset rest to its actual trigger, even when the owner differs', () => {
    let draft = completeSetInRounds(workout(true), 'b', 'b1', 90, now);
    draft = completeSetInRounds(draft, 'a', 'a1', 90, now);
    expect(draft.rest).toMatchObject({ workoutExerciseId: 'b', originExerciseId: 'a', originSetId: 'a1' });
    expect(undoWorkoutSetDone(draft, 'b', 'b1').rest).toBe(draft.rest);
    expect(undoWorkoutSetDone(draft, 'a', 'a1').rest).toBeUndefined();
  });

  it('keeps lowest unfinished superset round ahead of a later undone set', () => {
    let draft = completeSetInRounds(workout(true), 'b', 'b3', 90, now);
    draft = undoWorkoutSetDone(draft, 'b', 'b3');
    expect(currentSetToDo(draft)).toEqual({ workoutExerciseId: 'a', workoutSetId: 'a1' });
  });

  it.each([null, 'bad', { workoutExerciseId: 'a', workoutSetId: 'gone' },
    { workoutExerciseId: 3, workoutSetId: [] }])('drops malformed/stale optional selections: %j', (selection) => {
    expect(read({ ...workout(), undoSelection: selection } as WorkoutSessionDraft).undoSelection).toBeUndefined();
  });

  it('drops malformed origin/completion metadata while retaining the workout and countdown', () => {
    const draft = completeSet(workout(), 'a', 'a1', 90, now);
    const envelope = JSON.parse(serializeActiveWorkout(draft, 'owner'));
    envelope.draft.rest.originCompletionId = 12;
    envelope.draft.rest.id = [];
    envelope.draft.exercises[0].entries[0].completionId = {};
    const result = parsePersistedActiveWorkout(JSON.stringify(envelope), 'owner');
    expect(result.kind).toBe('ok');
    if (result.kind !== 'ok') return;
    expect(result.draft.rest?.endsAt).toBe(draft.rest?.endsAt);
    expect(result.draft.rest?.originSetId).toBeUndefined();
    expect(result.draft.rest?.id).toBeUndefined();
    expect(result.draft.exercises[0]!.entries[0]!.completionId).toBeUndefined();
  });
});
