import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { WatchWorkoutEvent } from '@workout/domain';
import { applyWatchEvent, toWatchSnapshot } from './watchProtocol';
import { decodeWatchMessage, encodeActiveContext } from '@/features/health/providers/appleWatchWire';
import { completeSet, undoWorkoutSetDone, adjustRest, type WorkoutSessionDraft } from '../state/workoutDraftStore';
import { parsePersistedActiveWorkout, serializeActiveWorkout } from '../persistence/activeWorkoutEnvelope';
const now = new Date('2026-11-04T10:00:00Z');
const draft = (): WorkoutSessionDraft => ({ id: 'w', clientId: 'c', routineId: 'r', routineName: 'R', startedAt: now.toISOString(), exercises: [{ id: 'a', exerciseId: 'e', exerciseName: 'E', order: 1, entries: [1, 2].map((n) => ({ id: `s${n}`, order: n, reps: '8', weightKg: '50', done: false, type: 'normal' })) }] });
const done: WatchWorkoutEvent = { kind: 'setDone', id: 'done-1', workoutSessionId: 'c', workoutExerciseId: 'a', workoutSetId: 's1', at: now.toISOString() };
const skip = (restId: string, id = 'skip-1'): WatchWorkoutEvent => ({ kind: 'skipRest', id, workoutSessionId: 'c', restId, at: now.toISOString() });
beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(now); });
afterEach(() => vi.useRealTimers());
describe('specific rest skip (0047)', () => {
  it('uses Done identity, skips without modifying sets or next-set order, and acknowledges', () => {
    const completed = applyWatchEvent(draft(), done, 90);
    expect(completed.rest?.id).toBe('done-1');
    const after = applyWatchEvent(completed, skip('done-1'), 90);
    expect(after.rest).toBeUndefined();
    expect(after.exercises).toBe(completed.exercises);
    expect(toWatchSnapshot(after, 90)).toMatchObject({ restSkipVersion: 1, lastProcessedSkipId: 'skip-1', currentSet: { workoutSetId: 's2' } });
  });
  it('matches stable identity after adjustment, but not another rest or a same-set retick', () => {
    const completed = applyWatchEvent(draft(), done, 90);
    expect(applyWatchEvent(adjustRest(completed, 15, now), skip('done-1'), 90).rest).toBeUndefined();
    const reticked = completeSet(undoWorkoutSetDone(completed, 'a', 's1'), 'a', 's1', 90, now);
    expect(applyWatchEvent(reticked, skip('done-1'), 90).rest).toBe(reticked.rest);
    const other = completeSet(completed, 'a', 's2', 90, now);
    expect(applyWatchEvent(other, skip('done-1'), 90).rest).toBe(other.rest);
  });
  it('handles Skip before Done across live/queued paths without creating an alertable rest', () => {
    const early = applyWatchEvent(draft(), skip('done-1'), 90);
    const after = applyWatchEvent(early, done, 90);
    expect(after.exercises[0]!.entries[0]!.done).toBe(true);
    expect(after.rest).toBeUndefined();
    expect(applyWatchEvent(after, skip('done-1'), 90)).toBe(after);
  });
  it('protects newer rests on controller restart/replay and retains durable acknowledgement', () => {
    let current = applyWatchEvent(applyWatchEvent(draft(), done, 90), skip('done-1'), 90);
    const parsed = parsePersistedActiveWorkout(serializeActiveWorkout(current, 'owner'), 'owner');
    if (parsed.kind !== 'ok') throw new Error('restore');
    current = completeSet(parsed.draft, 'a', 's2', 90, now);
    expect(applyWatchEvent(current, skip('done-1'), 90).rest).toBe(current.rest);
    expect(current.lastProcessedWatchSkipId).toBe('skip-1');
  });
  it('does not skip paused, expired, unknown-origin or foreign-workout rests', () => {
    const completed = applyWatchEvent(draft(), done, 90);
    const paused = { ...completed, pausedAt: now.toISOString() };
    expect(applyWatchEvent(paused, skip('done-1'), 90).rest).toBe(paused.rest);
    const legacy = { ...completed, rest: { ...completed.rest!, id: undefined } };
    expect(applyWatchEvent(legacy, skip('done-1'), 90).rest).toBe(legacy.rest);
    vi.advanceTimersByTime(91_000);
    expect(applyWatchEvent(completed, skip('done-1'), 90).rest).toBe(completed.rest);
    expect(applyWatchEvent(completed, { ...skip('done-1'), workoutSessionId: 'other' }, 90)).toBe(completed);
    expect(toWatchSnapshot(paused, 90).canSkipRest).toBe(false);
  });
  it('decodes only complete skip events, including a safe rejection of out-of-range instants', () => {
    const wire = { v: 1, id: 'skip-1', kind: 'skipRest', workoutId: 'c', restId: 'done-1', atMs: now.getTime() };
    expect(decodeWatchMessage('event', JSON.stringify(wire))).toEqual(skip('done-1'));
    for (const extra of [{ restId: '' }, { atMs: 1e30 }, { atMs: null }, { id: '' }]) {
      expect(decodeWatchMessage('event', JSON.stringify({ ...wire, ...extra }))).toBeNull();
    }
  });
});
