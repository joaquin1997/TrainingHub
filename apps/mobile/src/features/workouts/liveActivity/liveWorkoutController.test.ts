import type { LiveWorkoutBridge, LiveWorkoutState, Routine } from '@workout/domain';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  clearActiveWorkout,
  getActiveWorkout,
  pauseWorkout,
  setActiveWorkout,
  skipRest,
  startRest,
  startActiveWorkout,
  updateWorkoutSetDraft,
} from '@/features/workouts/state/workoutDraftStore';

import { startLiveWorkoutController } from './liveWorkoutController';

const routine: Routine = {
  id: 'r1',
  userId: 'u1',
  name: 'Push',
  exercises: [
    {
      id: 're1',
      routineId: 'r1',
      exerciseId: 'ex1',
      exerciseName: 'Bench',
      orderIndex: 1,
      sets: [{ id: 's1', routineExerciseId: 're1', setNumber: 1, createdAt: '', updatedAt: '' }],
      createdAt: '',
      updatedAt: '',
    },
  ],
  createdAt: '',
  updatedAt: '',
};

function fakeBridge(initial: LiveWorkoutState | null = null) {
  let state = initial;
  let surfaceListener: ((state: LiveWorkoutState) => void) | null = null;
  const bridge = {
    providerId: 'apple-health' as const,
    startLiveWorkout: vi.fn(async (payload) => {
      state = {
        workoutSessionId: payload.workoutSessionId,
        pausedAt: payload.pausedAt,
        pausedSeconds: payload.pausedSeconds ?? 0,
        updatedAt: '',
      };
    }),
    updateLiveWorkout: vi.fn(async () => undefined),
    finishLiveWorkout: vi.fn(async () => {
      state = null;
    }),
    getLiveWorkoutState: vi.fn(async () => state),
    onLiveWorkoutStateChange: vi.fn((listener) => {
      surfaceListener = listener;
      return () => {
        surfaceListener = null;
      };
    }),
  } satisfies LiveWorkoutBridge;

  return {
    bridge,
    /** Simulates a tap on the lock screen. */
    tapOnSurface(next: LiveWorkoutState) {
      state = next;
      surfaceListener?.(next);
    },
  };
}

describe('startLiveWorkoutController', () => {
  let stop: () => void = () => undefined;

  beforeEach(() => {
    clearActiveWorkout();
  });

  afterEach(() => {
    stop();
  });

  it('starts the surface when a workout starts, keyed by its identity (AC-1)', async () => {
    const { bridge } = fakeBridge();
    const controller = startLiveWorkoutController({ bridge });
    stop = controller.stop;

    const draft = startActiveWorkout(routine, 'kg', 'u1');
    await controller.idle();

    expect(bridge.startLiveWorkout).toHaveBeenCalledTimes(1);
    expect(bridge.startLiveWorkout).toHaveBeenCalledWith(
      expect.objectContaining({ workoutSessionId: draft.clientId, routineName: 'Push' }),
    );
  });

  it('pushes pauses but not logged sets', async () => {
    const { bridge } = fakeBridge();
    const controller = startLiveWorkoutController({ bridge });
    stop = controller.stop;
    const draft = startActiveWorkout(routine, 'kg', 'u1');
    await controller.idle();

    const exercise = draft.exercises[0]!;
    setActiveWorkout(updateWorkoutSetDraft(draft, exercise.id, exercise.entries[0]!.id, 'reps', '8'));
    await controller.idle();
    expect(bridge.updateLiveWorkout).not.toHaveBeenCalled();

    setActiveWorkout(pauseWorkout(getActiveWorkout()!));
    await controller.idle();
    expect(bridge.updateLiveWorkout).toHaveBeenCalledWith(
      expect.objectContaining({ pausedAt: expect.any(String) }),
    );
  });

  it('pushes the running rest when it starts, moves or ends (spec 0018 FR-8)', async () => {
    const { bridge } = fakeBridge();
    const controller = startLiveWorkoutController({ bridge });
    stop = controller.stop;
    const draft = startActiveWorkout(routine, 'kg', 'u1');
    await controller.idle();

    const resting = startRest(draft, draft.exercises[0]!.id, 90, new Date('2026-10-16T09:10:00.000Z'));
    setActiveWorkout(resting);
    await controller.idle();
    expect(bridge.updateLiveWorkout).toHaveBeenLastCalledWith(
      expect.objectContaining({ restEndsAt: '2026-10-16T09:11:30.000Z' }),
    );

    setActiveWorkout({ ...resting, notes: 'same rest' });
    await controller.idle();
    expect(bridge.updateLiveWorkout).toHaveBeenCalledTimes(1);

    setActiveWorkout(skipRest(getActiveWorkout()!));
    await controller.idle();
    expect(bridge.updateLiveWorkout).toHaveBeenCalledTimes(2);
    expect(bridge.updateLiveWorkout).toHaveBeenLastCalledWith(
      expect.objectContaining({ restEndsAt: undefined }),
    );
  });

  it('ends the surface when the workout is finished or discarded (AC-7)', async () => {
    const { bridge } = fakeBridge();
    const controller = startLiveWorkoutController({ bridge });
    stop = controller.stop;
    startActiveWorkout(routine, 'kg', 'u1');
    await controller.idle();

    clearActiveWorkout();
    await controller.idle();

    expect(bridge.finishLiveWorkout).toHaveBeenCalledTimes(1);
  });

  it('ends a surface left over with no workout behind it (EF-3)', async () => {
    const { bridge } = fakeBridge({ workoutSessionId: 'old', pausedSeconds: 0, updatedAt: '' });
    const controller = startLiveWorkoutController({ bridge });
    stop = controller.stop;
    await controller.idle();

    expect(bridge.finishLiveWorkout).toHaveBeenCalledTimes(1);
  });

  it('applies a pause tapped on the lock screen to the workout (AC-2, EF-4)', async () => {
    const { bridge, tapOnSurface } = fakeBridge();
    const controller = startLiveWorkoutController({ bridge });
    stop = controller.stop;
    const draft = startActiveWorkout(routine, 'kg', 'u1');
    await controller.idle();

    tapOnSurface({
      workoutSessionId: draft.clientId,
      pausedAt: '2026-10-16T09:20:00.000Z',
      pausedSeconds: 0,
      updatedAt: '',
    });
    await controller.idle();

    expect(getActiveWorkout()?.pausedAt).toBe('2026-10-16T09:20:00.000Z');
    // Adopted, not echoed back.
    expect(bridge.updateLiveWorkout).not.toHaveBeenCalled();
  });

  it('adopts on reconcile a pause made while the app was not running', async () => {
    const draft = startActiveWorkout(routine, 'kg', 'u1');
    const { bridge } = fakeBridge({
      workoutSessionId: draft.clientId,
      pausedAt: '2026-10-16T09:20:00.000Z',
      pausedSeconds: 30,
      updatedAt: '',
    });
    const controller = startLiveWorkoutController({ bridge });
    stop = controller.stop;
    await controller.idle();

    expect(getActiveWorkout()).toMatchObject({
      pausedAt: '2026-10-16T09:20:00.000Z',
      pausedSeconds: 30,
    });
    expect(bridge.startLiveWorkout).not.toHaveBeenCalled();
  });

  it('starts the surface again when the system removed it (EF-8)', async () => {
    startActiveWorkout(routine, 'kg', 'u1');
    const { bridge } = fakeBridge(null);
    const controller = startLiveWorkoutController({ bridge });
    stop = controller.stop;
    await controller.idle();

    expect(bridge.startLiveWorkout).toHaveBeenCalledTimes(1);
  });

  it('works with a bridge that cannot report its state (Android no-op)', async () => {
    const bridge: LiveWorkoutBridge = {
      providerId: 'android-health-connect',
      startLiveWorkout: vi.fn(async () => undefined),
      updateLiveWorkout: vi.fn(async () => undefined),
      finishLiveWorkout: vi.fn(async () => undefined),
    };
    const controller = startLiveWorkoutController({ bridge });
    stop = controller.stop;

    startActiveWorkout(routine, 'kg', 'u1');
    clearActiveWorkout();
    await controller.idle();

    expect(bridge.startLiveWorkout).toHaveBeenCalledTimes(1);
    expect(bridge.finishLiveWorkout).toHaveBeenCalledTimes(1);
  });

  it('keeps the workout working when the bridge fails (EF-1)', async () => {
    const onError = vi.fn();
    const { bridge } = fakeBridge();
    bridge.startLiveWorkout.mockRejectedValueOnce(new Error('activities disabled'));
    const controller = startLiveWorkoutController({ bridge, onError });
    stop = controller.stop;

    startActiveWorkout(routine, 'kg', 'u1');
    await controller.idle();

    expect(onError).toHaveBeenCalled();
    expect(getActiveWorkout()).not.toBeNull();
  });
});
