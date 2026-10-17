import { describe, expect, it } from 'vitest';

import { describeRecord } from './recordLabels';

const t = (key: string, options?: Record<string, unknown>) =>
  options ? `${key}${JSON.stringify(options)}` : key;
const date = '2026-05-08T09:00:00.000Z';

describe('describeRecord', () => {
  it('names most reps at a weight (AC-1)', () => {
    expect(
      describeRecord({ type: 'repsAtWeight', value: 8, weightKg: 100, date }, 'kg', t),
    ).toEqual({
      title: 'progress.records.repsAtWeight{"weight":"100 kg"}',
      value: 'progress.records.repsValue{"count":8}',
    });
  });

  it('shows weights and volumes in pounds when that is the display unit (FR-5)', () => {
    expect(
      describeRecord({ type: 'repsAtWeight', value: 8, weightKg: 100, date }, 'lb', t).title,
    ).toBe('progress.records.repsAtWeight{"weight":"220.5 lb"}');
    expect(
      describeRecord(
        { type: 'bestSetVolume', value: 800, weightKg: 100, reps: 8, date },
        'lb',
        t,
      ),
    ).toEqual({
      title: 'progress.records.bestSetVolume',
      value: '1763.7 lb',
      set: '220.5 lb × 8',
    });
  });

  it('shows the heaviest weight with its reps', () => {
    expect(
      describeRecord({ type: 'heaviestWeight', value: 100, weightKg: 100, reps: 6, date }, 'kg', t)
        .value,
    ).toBe('100 kg × 6');
  });

  it('shows most reps without a set when it had no weight', () => {
    expect(describeRecord({ type: 'mostReps', value: 15, reps: 15, date }, 'kg', t)).toEqual({
      title: 'progress.records.mostReps',
      value: 'progress.records.repsValue{"count":15}',
      set: undefined,
    });
  });

  it('shows session volume and estimated 1RM in the unit', () => {
    expect(describeRecord({ type: 'bestSessionVolume', value: 2400, date }, 'kg', t).value).toBe(
      '2400 kg',
    );
    expect(
      describeRecord(
        { type: 'bestEstimatedOneRepMax', value: 126.7, weightKg: 100, reps: 8, date },
        'kg',
        t,
      ),
    ).toEqual({
      title: 'progress.records.bestEstimatedOneRepMax',
      value: '126.7 kg',
      set: '100 kg × 8',
    });
  });
});
