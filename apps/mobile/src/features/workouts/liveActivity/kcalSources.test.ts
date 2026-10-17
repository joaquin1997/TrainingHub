import { describe, expect, it, vi } from 'vitest';

import { createKcalSources } from './kcalSources';

describe('kcal sources (spec 0025 FR-3)', () => {
  it('shows the phone reading until the watch measures the workout', () => {
    const show = vi.fn();
    const sources = createKcalSources(show);

    sources.fromPhone('c1', 80);
    sources.fromWatch('c1', 95);
    sources.fromPhone('c1', 70);
    sources.fromPhone('c1', null);

    expect(show.mock.calls).toEqual([
      ['c1', 80],
      ['c1', 95],
    ]);
  });

  it('uses the phone reading again for a workout the watch has not measured', () => {
    const show = vi.fn();
    const sources = createKcalSources(show);

    sources.fromWatch('c1', 95);
    sources.fromPhone('c2', 10);

    expect(show).toHaveBeenLastCalledWith('c2', 10);
  });
});
