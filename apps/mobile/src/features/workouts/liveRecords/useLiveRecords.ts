import { useEffect, useMemo, useRef, useState } from 'react';

import type { WorkoutSessionDraft } from '@/features/workouts/state/workoutDraftStore';

import {
  buildLiveRecordBadges,
  recordNotice,
  type LiveRecordBadges,
  type RecordNotice,
} from './liveRecordBadges';
import { useStartingRecords } from './useStartingRecords';

/** How long the notice stays (spec 0032 assumption: short, self-dismissing). */
export const RECORD_NOTICE_MS = 2500;

/**
 * Everything the workout screen needs for live records (spec 0032): loads and
 * keeps the starting records, derives the badges from the draft, and raises a
 * notice when a set just marked done earns one — from the phone or the watch.
 */
export function useLiveRecords(draft: WorkoutSessionDraft | null): {
  badges: LiveRecordBadges;
  notice?: RecordNotice;
} {
  useStartingRecords(draft);

  const badges = useMemo(() => buildLiveRecordBadges(draft), [draft]);
  const previousRef = useRef(draft);
  const [notice, setNotice] = useState<RecordNotice>();

  useEffect(() => {
    const previous = previousRef.current;
    previousRef.current = draft;
    if (previous === draft) {
      return;
    }

    const next = recordNotice(previous, draft, badges);
    if (next) {
      setNotice(next);
    } else if (!draft) {
      setNotice(undefined);
    }
  }, [draft, badges]);

  useEffect(() => {
    if (!notice) {
      return;
    }

    const timer = setTimeout(() => setNotice(undefined), RECORD_NOTICE_MS);
    return () => clearTimeout(timer);
  }, [notice]);

  return { badges, notice };
}
