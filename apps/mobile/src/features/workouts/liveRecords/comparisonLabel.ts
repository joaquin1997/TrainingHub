import type { RecordComparisonHit, WeightUnit } from '@workout/domain';
import { describeRecord } from '@/features/progress/utils/recordLabels';
type Translate = (key: string, options?: Record<string, unknown>) => string;
export function comparisonDetail(hit: RecordComparisonHit, unit: WeightUnit, t: Translate): string {
  const current = describeRecord(hit, unit, t);
  const baseline = describeRecord({ ...hit, value: hit.baselineValue }, unit, t);
  const scope = t(`workouts.recordComparison.${hit.baselineScope}`);
  let text = `${scope} · ${current.title} · ${current.value} (${t('workouts.recordComparison.previous', { value: baseline.value })})`;
  if (hit.type === 'repsAtWeight') text += ` · ${t(hit.baselineScope === 'historical' ? 'workouts.recordComparison.sameOrHeavier' : 'workouts.recordComparison.exactWeight')}`;
  if (hit.baselineScope === 'historical' && hit.lastSessionValue !== undefined) {
    text += ` · ${t('workouts.recordComparison.lastValue', { value: describeRecord({ ...hit, value: hit.lastSessionValue }, unit, t).value })}`;
  }
  return text;
}
export function comparisonSummary(hits: RecordComparisonHit[], unit: WeightUnit, t: Translate): string {
  const first = hits[0];
  if (!first) return '';
  let text = comparisonDetail(first, unit, t);
  const extraPRs = hits.slice(1).filter((hit) => hit.baselineScope === 'historical').length;
  const extraImprovements = hits.slice(1).filter((hit) => hit.baselineScope === 'lastSession').length;
  if (extraPRs) text += ` · ${t('workouts.recordComparison.moreRecords', { count: extraPRs })}`;
  if (extraImprovements) text += ` · ${t('workouts.recordComparison.moreImprovements', { count: extraImprovements })}`;
  return text;
}
