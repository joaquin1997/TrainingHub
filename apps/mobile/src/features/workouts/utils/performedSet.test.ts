import { describe, expect, it } from 'vitest';

import { isPerformedSet } from './performedSet';

describe('isPerformedSet', () => {
  it('trusts the server flag when present', () => {
    expect(isPerformedSet({ performed: true })).toBe(true);
    expect(isPerformedSet({ performed: false, completedAt: '2026-09-24T10:00:00Z' })).toBe(false);
  });

  it('treats a legacy set flagged by the server as performed', () => {
    expect(isPerformedSet({ performed: true, completedAt: undefined })).toBe(true);
  });

  it('falls back to completedAt for an older API', () => {
    expect(isPerformedSet({ completedAt: '2026-09-24T10:00:00Z' })).toBe(true);
    expect(isPerformedSet({})).toBe(false);
  });
});
