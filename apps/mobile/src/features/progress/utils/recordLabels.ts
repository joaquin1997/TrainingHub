import type { ExerciseRecord, WeightUnit } from '@workout/domain';

import { formatDuration } from '@/lib/format';
import { formatDistance } from '@/lib/tracking';
import { formatWeight } from '@/lib/weight';

type Translate = (key: string, options?: Record<string, unknown>) => string;

export interface RecordLabel {
  /** What the record is, e.g. "Most reps at 100 kg". */
  title: string;
  /** Its figure, e.g. "8 reps" or "2400 kg". */
  value: string;
  /** The set behind it, when that adds something, e.g. "100 kg × 8". */
  set?: string;
}

function formatSet(record: ExerciseRecord, unit: WeightUnit): string | undefined {
  if (record.weightKg === undefined || record.reps === undefined) {
    return undefined;
  }
  return `${formatWeight(record.weightKg, unit)} × ${record.reps}`;
}

/**
 * Title and figure of a record (spec 0023), weights and volumes in the display
 * unit (FR-5). Records arrive in kg; nothing here is stored.
 */
export function describeRecord(
  record: ExerciseRecord,
  unit: WeightUnit,
  t: Translate,
): RecordLabel {
  const reps = (count: number) => t('progress.records.repsValue', { count });

  switch (record.type) {
    case 'heaviestWeight':
      return {
        title: t('progress.records.heaviestWeight'),
        value:
          record.reps !== undefined
            ? `${formatWeight(record.value, unit)} × ${record.reps}`
            : formatWeight(record.value, unit),
      };
    case 'mostReps':
      return {
        title: t('progress.records.mostReps'),
        value: reps(record.value),
        set: formatSet(record, unit),
      };
    case 'repsAtWeight':
      return {
        title: t('progress.records.repsAtWeight', {
          weight: formatWeight(record.weightKg, unit),
        }),
        value: reps(record.value),
      };
    case 'bestSetVolume':
      return {
        title: t('progress.records.bestSetVolume'),
        value: formatWeight(record.value, unit),
        set: formatSet(record, unit),
      };
    case 'bestSessionVolume':
      return {
        title: t('progress.records.bestSessionVolume'),
        value: formatWeight(record.value, unit),
      };
    case 'bestEstimatedOneRepMax':
      return {
        title: t('progress.records.bestEstimatedOneRepMax'),
        value: formatWeight(record.value, unit),
        set: formatSet(record, unit),
      };
    // Time and distance records (spec 0021 FR-6); a weighted hold names its weight.
    case 'longestTime':
      return {
        title: t('progress.longestTime'),
        value: formatDuration(record.value),
        set: record.weightKg !== undefined ? formatWeight(record.weightKg, unit) : undefined,
      };
    case 'longestDistance':
      return {
        title: t('progress.longestDistance'),
        value: formatDistance(record.value),
      };
  }
}
