import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');

describe('Live Activity attributes (spec 0012)', () => {
  // The app/extension `_shared` copy and this module's copy must match
  // exactly: ActivityKit matches activities by this type's shape, and a pod
  // cannot import types from the app target.
  it('keeps the two Swift copies identical', () => {
    expect(read('./ios/WorkoutActivityAttributes.swift')).toBe(
      read('../../targets/workout-activity/_shared/WorkoutActivityAttributes.swift'),
    );
  });
});
