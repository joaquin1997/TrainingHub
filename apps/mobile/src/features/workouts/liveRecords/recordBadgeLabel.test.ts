import { describe, expect, it } from 'vitest';

import { recordBadgeAccessibilityLabel, recordBadgeLabel } from './recordBadgeLabel';

const t = (key: string, options?: Record<string, unknown>) =>
  options ? `${key}${JSON.stringify(options)}` : key;

describe('recordBadgeLabel', () => {
  it('names the first record and counts the rest (FR-13)', () => {
    expect(
      recordBadgeLabel(
        [
          { type: 'repsAtWeight', value: 8, weightKg: 100 },
          { type: 'bestSetVolume', value: 800 },
          { type: 'bestEstimatedOneRepMax', value: 126.7 },
        ],
        'kg',
        t,
      ),
    ).toBe('progress.records.repsAtWeight{"weight":"100 kg"} progress.records.liveMore{"count":2}');
  });

  it('shows the weight in the display unit', () => {
    expect(recordBadgeLabel([{ type: 'repsAtWeight', value: 8, weightKg: 100 }], 'lb', t)).toBe(
      'progress.records.repsAtWeight{"weight":"220.5 lb"}',
    );
  });

  it('lists every record for screen readers', () => {
    expect(
      recordBadgeAccessibilityLabel(
        [
          { type: 'heaviestWeight', value: 105 },
          { type: 'longestTime', value: 75 },
        ],
        'kg',
        t,
      ),
    ).toBe('progress.records.heaviestWeight, progress.longestTime');
  });
});
