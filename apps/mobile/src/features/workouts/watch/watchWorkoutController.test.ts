import type {
  WatchWorkoutBridge,
  WatchWorkoutEvent,
  WatchWorkoutOutcome,
  WatchWorkoutSnapshot,
} from '@workout/domain';
import { describe, expect, it, vi } from 'vitest';

import type { ActiveWorkoutStore } from '@/features/workouts/liveActivity/liveWorkoutController';
import type { WorkoutSessionDraft } from '@/features/workouts/state/workoutDraftStore';

import { startWatchWorkoutController } from './watchWorkoutController';

const draft = (clientId: string): WorkoutSessionDraft => ({
  id: 'w',
  clientId,
  routineId: 'r',
  routineName: 'Push',
  startedAt: '2026-10-17T09:00:00.000Z',
  exercises: [
    {
      id: 'a',
      exerciseId: 'ex-a',
      exerciseName: 'A',
      order: 1,
      restSeconds: 60,
      entries: [1, 2].map((order) => ({
        id: `a${order}`,
        order,
        reps: '8',
        weightKg: '50',
        done: false,
        type: 'normal' as const,
      })),
    },
  ],
});

function fakeStore(initial: WorkoutSessionDraft | null = null) {
  let current = initial;
  const listeners = new Set<() => void>();
  const store: ActiveWorkoutStore & { replace(next: WorkoutSessionDraft | null): void } = {
    get: () => current,
    set: (next) => store.replace(next),
    replace(next) {
      current = next;
      listeners.forEach((listener) => listener());
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
  return store;
}

function fakeBridge() {
  let listener: ((event: WatchWorkoutEvent) => void) | null = null;
  const bridge = {
    providerId: 'apple-health' as const,
    startWatchWorkout: vi.fn(async (_snapshot: WatchWorkoutSnapshot) => {}),
    updateWatchWorkout: vi.fn(async (_snapshot: WatchWorkoutSnapshot) => {}),
    endWatchWorkout: vi.fn(async (_id: string, _outcome: WatchWorkoutOutcome) => {}),
    onWatchWorkoutEvent: vi.fn((next: (event: WatchWorkoutEvent) => void) => {
      listener = next;
      return () => {
        listener = null;
      };
    }),
    emit: (event: WatchWorkoutEvent) => listener?.(event),
  } satisfies WatchWorkoutBridge & { emit: unknown };
  return bridge;
}

const tick = (id: string, workoutSetId: string, at: string, workoutSessionId = 'c1'): WatchWorkoutEvent => ({
  kind: 'setDone',
  id,
  workoutSessionId,
  workoutExerciseId: 'a',
  workoutSetId,
  at,
});

describe('watch workout controller (spec 0025)', () => {
  it('starts the watch workout once per workout (FR-2)', async () => {
    const store = fakeStore(draft('c1'));
    const bridge = fakeBridge();
    const controller = startWatchWorkoutController({ bridge, store, defaultRestSeconds: () => 90 });

    store.replace({ ...store.get()! });
    await controller.idle();

    expect(bridge.startWatchWorkout).toHaveBeenCalledTimes(1);
    expect(bridge.startWatchWorkout.mock.calls[0]![0]).toMatchObject({
      workoutSessionId: 'c1',
      currentSet: { workoutSetId: 'a1', target: '50 kg × 8', restSeconds: 60 },
    });
    expect(bridge.updateWatchWorkout).not.toHaveBeenCalled();
  });

  it('sends a change of what the watch shows', async () => {
    const store = fakeStore(draft('c1'));
    const bridge = fakeBridge();
    const controller = startWatchWorkoutController({ bridge, store, defaultRestSeconds: () => 90 });

    store.replace({ ...store.get()!, pausedAt: '2026-10-17T09:05:00.000Z' });
    await controller.idle();

    expect(bridge.updateWatchWorkout).toHaveBeenCalledTimes(1);
    expect(bridge.updateWatchWorkout.mock.calls[0]![0]).toMatchObject({
      pausedAt: '2026-10-17T09:05:00.000Z',
    });
  });

  it('ends as finished when the workout was saved, else discarded', async () => {
    const store = fakeStore(draft('c1'));
    const bridge = fakeBridge();
    const saved = new Set(['c1']);
    const controller = startWatchWorkoutController({
      bridge,
      store,
      defaultRestSeconds: () => 90,
      wasFinished: (id) => saved.has(id),
    });

    store.replace(null);
    store.replace(draft('c2'));
    store.replace(draft('c3'));
    await controller.idle();

    expect(bridge.endWatchWorkout.mock.calls).toEqual([
      ['c1', 'finished'],
      ['c2', 'discarded'],
    ]);
    expect(bridge.startWatchWorkout).toHaveBeenCalledTimes(3);
  });

  it('applies queued ticks in order and ignores a repeat (AC-3, EF-1)', async () => {
    const store = fakeStore(draft('c1'));
    const bridge = fakeBridge();
    const controller = startWatchWorkoutController({ bridge, store, defaultRestSeconds: () => 90 });

    bridge.emit(tick('t1', 'a1', '2026-10-17T09:10:00.000Z'));
    bridge.emit(tick('t2', 'a2', '2026-10-17T09:12:00.000Z'));
    bridge.emit(tick('t1', 'a1', '2026-10-17T09:10:00.000Z'));
    await controller.idle();

    const current = store.get()!;
    expect(current.exercises[0]!.entries.map((set) => set.done)).toEqual([true, true]);
    expect(current.rest?.endsAt).toBe('2026-10-17T09:13:00.000Z');
    // The watch learns the result: done sets, the rest, no set left.
    const last = bridge.updateWatchWorkout.mock.calls.at(-1)![0];
    expect(last).toMatchObject({ restEndsAt: '2026-10-17T09:13:00.000Z' });
    expect(last?.currentSet).toBeUndefined();
  });

  it('drops events for another workout', () => {
    const store = fakeStore(draft('c1'));
    const bridge = fakeBridge();
    const onActiveEnergy = vi.fn();
    startWatchWorkoutController({ bridge, store, defaultRestSeconds: () => 90, onActiveEnergy });

    bridge.emit(tick('t1', 'a1', '2026-10-17T09:10:00.000Z', 'old'));
    bridge.emit({ kind: 'activeEnergy', workoutSessionId: 'old', kcal: 300 });

    expect(store.get()!.exercises[0]!.entries[0]!.done).toBe(false);
    expect(onActiveEnergy).not.toHaveBeenCalled();
  });

  it('passes the watch calories and a finish request on (FR-3)', () => {
    const store = fakeStore(draft('c1'));
    const bridge = fakeBridge();
    const onActiveEnergy = vi.fn();
    const onFinishRequested = vi.fn();
    startWatchWorkoutController({
      bridge,
      store,
      defaultRestSeconds: () => 90,
      onActiveEnergy,
      onFinishRequested,
    });

    bridge.emit({ kind: 'activeEnergy', workoutSessionId: 'c1', kcal: 212 });
    bridge.emit({ kind: 'finishRequested', id: 'f1', workoutSessionId: 'c1' });
    bridge.emit({ kind: 'finishRequested', id: 'f1', workoutSessionId: 'c1' });

    expect(onActiveEnergy).toHaveBeenCalledWith('c1', 212);
    expect(onFinishRequested).toHaveBeenCalledTimes(1);
  });

  it('stops listening when stopped', () => {
    const store = fakeStore(draft('c1'));
    const bridge = fakeBridge();
    const controller = startWatchWorkoutController({ bridge, store, defaultRestSeconds: () => 90 });

    controller.stop();
    store.replace(null);

    expect(bridge.endWatchWorkout).not.toHaveBeenCalled();
  });
});
