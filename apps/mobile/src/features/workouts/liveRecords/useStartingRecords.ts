import { useEffect, useRef, useState } from 'react';

import {
  getActiveWorkout,
  setActiveWorkout,
  type WorkoutSessionDraft,
} from '@/features/workouts/state/workoutDraftStore';
import { isPermanentRejection } from '@/lib/http';

import { startingRecordsClient } from './startingRecordsClient';
import { missingStartingRecordIds, withStartingRecords } from './startingRecordsDraft';

/** How long to wait before asking again after a failed load (EF-2). */
export const STARTING_RECORDS_RETRY_MS = 30_000;

/**
 * Loads the starting records of every exercise in the active workout that has
 * none kept (spec 0032 FR-1, FR-2, EF-4) and keeps them on the draft (FR-3).
 * A failed load leaves that exercise without badges (EF-1) and is retried
 * while the screen is open (EF-2); an older server that refuses the request
 * stops it for this workout (EF-3). Nothing else in the workout waits on it.
 *
 * TODO(sdd): the retry is a timer, not a connectivity event — switch when a
 * connectivity listener exists (plan, Risks).
 */
export function useStartingRecords(draft: WorkoutSessionDraft | null): void {
  const missingKey = draft ? missingStartingRecordIds(draft).join(',') : '';
  const clientId = draft?.clientId;
  const [attempt, setAttempt] = useState(0);
  const refusedForRef = useRef<string | null>(null);

  useEffect(() => {
    if (!missingKey || !clientId || refusedForRef.current === clientId) {
      return;
    }

    let active = true;
    let retry: ReturnType<typeof setTimeout> | undefined;

    startingRecordsClient
      .list(missingKey.split(','))
      .then((records) => {
        // Into the workout as it is now, and only the same workout.
        const current = getActiveWorkout();
        if (!current || current.clientId !== clientId) {
          return;
        }

        const next = withStartingRecords(current, records);
        if (next !== current) {
          setActiveWorkout(next);
        }
      })
      .catch((error: unknown) => {
        if (!active) {
          return;
        }

        if (isPermanentRejection(error)) {
          refusedForRef.current = clientId;
          return;
        }

        retry = setTimeout(() => setAttempt((count) => count + 1), STARTING_RECORDS_RETRY_MS);
      });

    return () => {
      active = false;
      if (retry) {
        clearTimeout(retry);
      }
    };
  }, [missingKey, clientId, attempt]);
}
