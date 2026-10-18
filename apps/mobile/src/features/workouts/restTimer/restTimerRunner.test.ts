import type { Routine } from '@workout/domain';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  adjustRest,
  clearActiveWorkout,
  getActiveWorkout,
  hydrateActiveWorkout,
  setActiveWorkout,
  skipRest,
  startActiveWorkout,
  startRest,
  type WorkoutSessionDraft,
} from '@/features/workouts/state/workoutDraftStore';

import type { RestAlerts } from './restAlerts';
import { startRestTimerRunner } from './restTimerRunner';

const routine: Routine = {
  id: 'r1',
  userId: 'u1',
  name: 'Legs',
  exercises: [
    {
      id: 're1',
      routineId: 'r1',
      exerciseId: 'ex1',
      exerciseName: 'Squat',
      orderIndex: 1,
      restSeconds: 120,
      sets: [{ id: 's1', routineExerciseId: 're1', setNumber: 1, createdAt: '', updatedAt: '' }],
      createdAt: '',
      updatedAt: '',
    },
  ],
  createdAt: '',
  updatedAt: '',
};

const T0 = new Date(Date.UTC(2026, 9, 16, 9, 0, 0));

function fakeAlerts() {
  return {
    requestPermission: vi.fn(async () => true),
    schedule: vi.fn(async () => undefined),
    cancel: vi.fn(async () => undefined),
    outsideApp: true,
    permissionStatus: vi.fn(async () => 'notAsked' as const),
    openSystemSettings: vi.fn(async () => undefined),
  } satisfies RestAlerts;
}

describe('rest timer runner (spec 0018)', () => {
  let alerts: ReturnType<typeof fakeAlerts>;
  let vibrate: ReturnType<typeof vi.fn<() => void>>;
  let appActive: boolean;
  let runner: ReturnType<typeof startRestTimerRunner> | null;

  const start = () => {
    runner = startRestTimerRunner({
      alerts,
      vibrate,
      isAppActive: () => appActive,
      alertContent: (draft) => ({ title: 'Rest over', body: draft.exercises[0]!.exerciseName }),
    });
    return runner;
  };

  const workout = () => getActiveWorkout() as WorkoutSessionDraft;
  const exerciseId = () => workout().exercises[0]!.id;
  const tickRest = (seconds: number) =>
    setActiveWorkout(startRest(workout(), exerciseId(), seconds, new Date()));

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(T0);
    alerts = fakeAlerts();
    vibrate = vi.fn();
    appActive = true;
    runner = null;
    clearActiveWorkout();
    startActiveWorkout(routine);
  });

  afterEach(() => {
    runner?.stop();
    clearActiveWorkout();
    vi.useRealTimers();
  });

  it('schedules the alert at the end when a rest starts', async () => {
    const r = start();
    tickRest(120);
    await r.idle();

    expect(alerts.schedule).toHaveBeenCalledTimes(1);
    expect(alerts.schedule).toHaveBeenCalledWith(new Date(T0.getTime() + 120_000), {
      title: 'Rest over',
      body: 'Squat',
    });
  });

  it('asks for permission once per run, at the first rest (EF-1)', async () => {
    const r = start();
    expect(alerts.requestPermission).not.toHaveBeenCalled();

    tickRest(60);
    tickRest(90);
    await r.idle();

    expect(alerts.requestPermission).toHaveBeenCalledTimes(1);
    expect(alerts.schedule).toHaveBeenCalledTimes(2);
  });

  it('reschedules when the rest is moved by ±15 s (FR-3)', async () => {
    const r = start();
    tickRest(60);
    setActiveWorkout(adjustRest(workout(), 15, new Date()));
    await r.idle();

    expect(alerts.schedule).toHaveBeenLastCalledWith(
      new Date(T0.getTime() + 75_000),
      expect.anything(),
    );

    // Logging a set does not reschedule.
    setActiveWorkout({ ...workout(), notes: 'deep' });
    await r.idle();
    expect(alerts.schedule).toHaveBeenCalledTimes(2);
  });

  it('cancels the alert when the rest is skipped, and never vibrates (EF-2, AC-5)', async () => {
    const r = start();
    tickRest(60);
    setActiveWorkout(skipRest(workout()));
    await vi.advanceTimersByTimeAsync(120_000);
    await r.idle();

    expect(alerts.cancel).toHaveBeenCalledTimes(1);
    expect(vibrate).not.toHaveBeenCalled();
  });

  it('cancels the alert when the workout is finished or discarded (EF-2)', async () => {
    const r = start();
    tickRest(60);
    clearActiveWorkout();
    await vi.advanceTimersByTimeAsync(120_000);
    await r.idle();

    expect(alerts.cancel).toHaveBeenCalledTimes(1);
    expect(vibrate).not.toHaveBeenCalled();
  });

  it('vibrates exactly once at the end in the app and clears the rest, keeping the system alert', async () => {
    const r = start();
    tickRest(60);

    await vi.advanceTimersByTimeAsync(59_000);
    expect(vibrate).not.toHaveBeenCalled();
    expect(workout().rest).toBeDefined();

    await vi.advanceTimersByTimeAsync(1_000);
    r.check();
    await vi.advanceTimersByTimeAsync(60_000);
    await r.idle();

    expect(vibrate).toHaveBeenCalledTimes(1);
    expect(workout().rest).toBeUndefined();
    expect(alerts.cancel).not.toHaveBeenCalled();
  });

  it('does not vibrate when the rest ends with the app in the background', async () => {
    start();
    tickRest(60);
    appActive = false;
    await vi.advanceTimersByTimeAsync(60_000);

    expect(vibrate).not.toHaveBeenCalled();
    expect(workout().rest).toBeUndefined();
    expect(alerts.cancel).not.toHaveBeenCalled();
  });

  it('clears a rest found long past its end on foreground, silently (EF-3)', async () => {
    const r = start();
    tickRest(60);
    appActive = false;
    // Suspended: the timeout never ran.
    vi.clearAllTimers();
    vi.setSystemTime(new Date(T0.getTime() + 5 * 60_000));

    appActive = true;
    r.check();

    expect(vibrate).not.toHaveBeenCalled();
    expect(workout().rest).toBeUndefined();
  });

  it('clears a stale rest restored at startup without alerting again (EF-3)', async () => {
    const draft = startRest(workout(), exerciseId(), 60, new Date(T0.getTime() - 10 * 60_000));
    hydrateActiveWorkout(draft, 'u1');

    const r = start();
    await r.idle();

    expect(workout().rest).toBeUndefined();
    expect(vibrate).not.toHaveBeenCalled();
    expect(alerts.schedule).not.toHaveBeenCalled();
    expect(alerts.cancel).not.toHaveBeenCalled();
  });

  it('reschedules a running rest restored after a restart at the same end (FR-7)', async () => {
    const draft = startRest(workout(), exerciseId(), 120, new Date(T0.getTime() - 30_000));
    hydrateActiveWorkout(draft, 'u1');

    const r = start();
    await r.idle();

    expect(alerts.schedule).toHaveBeenCalledWith(
      new Date(T0.getTime() + 90_000),
      expect.anything(),
    );

    await vi.advanceTimersByTimeAsync(90_000);
    expect(vibrate).toHaveBeenCalledTimes(1);
  });

  it('keeps counting with no screen involved (AC-3)', async () => {
    start();
    tickRest(90);
    await vi.advanceTimersByTimeAsync(30_000);

    expect(workout().rest?.endsAt).toBe(new Date(T0.getTime() + 90_000).toISOString());
  });
});
