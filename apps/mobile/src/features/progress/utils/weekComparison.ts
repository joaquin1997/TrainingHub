import type { SessionRecord, SessionRecords, WorkoutSession } from '@workout/domain';
import { RECORD_TYPE_ORDER } from '@workout/domain/records';

import { summarizeSession } from '@/features/workouts/utils/sessionStats';
import { addDays, startOfWeek } from '@/lib/week';

export interface WeekVolumeComparison {
  /** Performed volume of this week so far, kg. */
  thisWeekKg: number;
  /** Last week's volume up to the same weekday and time, kg. */
  lastWeekToDateKg: number;
  /** Last week's full volume, kg. */
  lastWeekTotalKg: number;
  /** Whether last week had any workout; without one there is no comparison. */
  hasLastWeek: boolean;
}

type VolumeSession = Pick<WorkoutSession, 'startedAt' | 'exercises'>;

/**
 * This week's training volume against last week up to the same point (spec
 * 0035 FR-11), so a Monday never reads as a big drop. A workout counts in the
 * week it started (EF-12).
 */
export function weekVolumeComparison(sessions: VolumeSession[], now: Date): WeekVolumeComparison {
  const monday = startOfWeek(now).getTime();
  const lastMonday = addDays(startOfWeek(now), -7).getTime();
  const sameTimeLastWeek = addDays(now, -7).getTime();

  const result: WeekVolumeComparison = {
    thisWeekKg: 0,
    lastWeekToDateKg: 0,
    lastWeekTotalKg: 0,
    hasLastWeek: false,
  };

  for (const session of sessions) {
    const started = Date.parse(session.startedAt);
    if (Number.isNaN(started) || started < lastMonday || started > now.getTime()) {
      continue;
    }
    const volume = summarizeSession(session).volumeKg;
    if (started >= monday) {
      result.thisWeekKg += volume;
    } else {
      result.hasLastWeek = true;
      result.lastWeekTotalKg += volume;
      if (started <= sameTimeLastWeek) {
        result.lastWeekToDateKg += volume;
      }
    }
  }

  return result;
}

/**
 * The most recent personal record of any exercise and type (spec 0035 FR-11):
 * from the newest workout that beat any, the first in the records' display
 * order. Null when no workout ever beat one.
 */
export function latestRecord(sessionRecords: SessionRecords[]): SessionRecord | null {
  let newest: SessionRecords | null = null;
  for (const entry of sessionRecords) {
    if (entry.records.length === 0) {
      continue;
    }
    if (!newest || Date.parse(entry.records[0]!.date) > Date.parse(newest.records[0]!.date)) {
      newest = entry;
    }
  }
  if (!newest) {
    return null;
  }
  const rank = (record: SessionRecord) => RECORD_TYPE_ORDER.indexOf(record.type);
  return [...newest.records].sort((left, right) => rank(left) - rank(right))[0]!;
}
