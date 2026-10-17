import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { activeWorkoutStorage } from './asyncActiveWorkoutStorage';
import {
  hydrateActiveWorkoutFromStorage,
  startActiveWorkoutPersister,
} from './activeWorkoutPersister';

/**
 * Keeps the active workout on the device (spec 0010). Mirrors every change to
 * storage, flushes when the app leaves the foreground, and restores the stored
 * workout once a user is known — at launch, or after the next sign-in when the
 * app starts signed out (EF-6). Returns true while that restore is pending, so
 * no screen renders before the workout is back.
 */
export function useActiveWorkoutPersistence(userId: string | null): boolean {
  const [hydratedFor, setHydratedFor] = useState<string | null>(null);

  useEffect(() => {
    const persister = startActiveWorkoutPersister(activeWorkoutStorage);
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') {
        void persister.flush();
      }
    });

    return () => {
      subscription.remove();
      persister.stop();
    };
  }, []);

  useEffect(() => {
    if (!userId) {
      // Signed out: stored data stays untouched until someone signs in (EF-6).
      return;
    }

    let active = true;
    void hydrateActiveWorkoutFromStorage(activeWorkoutStorage, userId).finally(() => {
      if (active) {
        setHydratedFor(userId);
      }
    });

    return () => {
      active = false;
    };
  }, [userId]);

  return userId !== null && hydratedFor !== userId;
}
