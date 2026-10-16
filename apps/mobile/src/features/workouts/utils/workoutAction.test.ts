import { describe, expect, it } from 'vitest';

import { parseWorkoutAction } from './workoutAction';

describe('parseWorkoutAction', () => {
  it('recognises finish, also as the first of repeated params', () => {
    expect(parseWorkoutAction('finish')).toBe('finish');
    expect(parseWorkoutAction(['finish', 'x'])).toBe('finish');
  });

  it('ignores anything else', () => {
    expect(parseWorkoutAction(undefined)).toBeNull();
    expect(parseWorkoutAction('delete')).toBeNull();
    expect(parseWorkoutAction('')).toBeNull();
  });
});
