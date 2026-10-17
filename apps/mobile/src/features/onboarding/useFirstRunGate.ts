import { createContext, useCallback, useContext, useEffect, useState } from 'react';

import { routinesClient } from '@/features/routines/api/routinesClient';
import { useSettings } from '@/features/settings/SettingsContext';
import { workoutsClient } from '@/features/workouts/api/workoutsClient';
import { getActiveWorkout } from '@/features/workouts/state/workoutDraftStore';
import { deviceKeys, deviceStore } from '@/lib/deviceStore';

import { firstRunDecision, isAccountSetUp, settingsAlreadySetUp } from './firstRunRules';

/** Deciding never holds the app longer than this (spec 0037 NFR "Speed"). */
const DECIDE_TIMEOUT_MS = 3000;

export type FirstRunStatus = 'deciding' | 'show' | 'none';

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout')), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

/**
 * Whether the signed-in account sees the first run (spec 0037 FR-1 – FR-4),
 * decided once per sign-in or app start, never in the middle of using the
 * app. An account found to be set up is recorded as done without showing
 * anything (FR-2); when it cannot be told, nothing is recorded (EF-2).
 */
export function useFirstRunGate({ userId, ready }: { userId: string | null; ready: boolean }) {
  const { settings, loadState } = useSettings();
  const [decided, setDecided] = useState<{ userId: string; status: FirstRunStatus } | null>(null);

  // A sign-out forgets the decision: the next sign-in decides again (EF-4).
  useEffect(() => {
    if (!userId) {
      setDecided(null);
    }
  }, [userId]);

  useEffect(() => {
    if (!userId || !ready || loadState === 'loading' || decided?.userId === userId) {
      return;
    }

    let active = true;
    const decide = async (): Promise<FirstRunStatus> => {
      const key = deviceKeys.firstRunDone(userId);
      const done = (await deviceStore.get(key)) === '1';
      let setUp: boolean | null = null;
      if (!done && loadState === 'loaded') {
        setUp = settingsAlreadySetUp(settings)
          ? true
          : await withTimeout(
              Promise.all([routinesClient.list(), workoutsClient.list()]),
              DECIDE_TIMEOUT_MS,
            )
              .then(([routines, workouts]) =>
                isAccountSetUp({
                  settings,
                  routineCount: routines.length,
                  workoutCount: workouts.length,
                }),
              )
              .catch(() => null);
      }
      const decision = firstRunDecision({
        done,
        setUp,
        hasActiveWorkout: getActiveWorkout() !== null,
      });
      if (decision === 'record') {
        await deviceStore.set(key, '1');
      }
      return decision === 'show' ? 'show' : 'none';
    };

    setDecided({ userId, status: 'deciding' });
    void decide().then((status) => {
      if (active) {
        setDecided({ userId, status });
      }
    });

    return () => {
      active = false;
    };
    // Settings are read when deciding; a later change must not re-decide.
  }, [userId, ready, loadState]);

  /** Finished or skipped: never again for this account on this device (FR-3). */
  const complete = useCallback(async () => {
    if (!userId) {
      return;
    }
    await deviceStore.set(deviceKeys.firstRunDone(userId), '1');
    setDecided({ userId, status: 'none' });
  }, [userId]);

  const status: FirstRunStatus =
    !userId || !ready
      ? 'none'
      : decided?.userId === userId
        ? decided.status
        : 'deciding';

  return { status, complete };
}

/** Lets the first-run screen record itself as done (provided by the root navigator). */
export const FirstRunContext = createContext<{ complete: () => Promise<void> }>({
  complete: async () => {},
});

export function useFirstRunCompletion() {
  return useContext(FirstRunContext);
}
