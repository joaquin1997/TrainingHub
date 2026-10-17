import type { LiveRecordHit, WeightUnit } from '@workout/domain';

import { describeRecord } from '@/features/progress/utils/recordLabels';

type Translate = (key: string, options?: Record<string, unknown>) => string;

/**
 * What a record badge says (spec 0032 FR-13): the most significant record
 * beaten — the first in display order — and how many more, e.g.
 * "Most reps at 100 kg +2". Weights in the display unit.
 */
export function recordBadgeLabel(
  hits: LiveRecordHit[],
  unit: WeightUnit,
  t: Translate,
): string {
  const [first] = hits;
  if (!first) {
    return '';
  }

  const title = describeRecord(first, unit, t).title;
  return hits.length > 1
    ? `${title} ${t('progress.records.liveMore', { count: hits.length - 1 })}`
    : title;
}

/** Every record beaten, for screen readers. */
export function recordBadgeAccessibilityLabel(
  hits: LiveRecordHit[],
  unit: WeightUnit,
  t: Translate,
): string {
  return hits.map((hit) => describeRecord(hit, unit, t).title).join(', ');
}
