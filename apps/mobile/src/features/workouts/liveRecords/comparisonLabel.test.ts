import { describe, expect, it } from 'vitest';
import { comparisonDetail, comparisonSummary } from './comparisonLabel';
import type { RecordComparisonHit } from '@workout/domain';
const t = (key: string, values?: Record<string, unknown>) => key + (values ? JSON.stringify(values) : '');
const hit: RecordComparisonHit = { type: 'repsAtWeight', value: 13, weightKg: 180, baselineValue: 12, baselineScope: 'historical', lastSessionValue: 10 };
describe('comparison explanations', () => {
  it('shows actual and previous figures, same-or-heavier scope and exact last-session baseline', () => {
    const text = comparisonDetail(hit, 'kg', t);
    expect(text).toContain('180 kg'); expect(text).toContain('13'); expect(text).toContain('12'); expect(text).toContain('sameOrHeavier'); expect(text).toContain('10');
    expect(comparisonDetail({ ...hit, baselineScope: 'lastSession' }, 'lb', t)).toContain('exactWeight');
    expect(comparisonDetail(hit, 'lb', t)).toContain('396.8 lb');
  });
  it('counts additional records separately from improvements, without bare +N', () => {
    const text = comparisonSummary([hit, { ...hit, type: 'bestSetVolume' }, { ...hit, type: 'heaviestWeight', baselineScope: 'lastSession' }], 'kg', t);
    expect(text).toContain('moreRecords{"count":1}'); expect(text).toContain('moreImprovements{"count":1}'); expect(text).not.toMatch(/\+\d/);
  });
});
