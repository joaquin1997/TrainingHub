import { describe, expect, it } from 'vitest';

import { parseWorkoutAction, resolveDiscardLink } from './workoutAction';

describe('parseWorkoutAction', () => {
  it('recognises finish, also as the first of repeated params', () => {
    expect(parseWorkoutAction('finish')).toBe('finish');
    expect(parseWorkoutAction(['finish', 'x'])).toBe('finish');
  });

  it('recognises switch and discard', () => {
    expect(parseWorkoutAction('switch')).toBe('switch');
    expect(parseWorkoutAction('discard')).toBe('discard');
  });

  it('ignores anything else', () => {
    expect(parseWorkoutAction(undefined)).toBeNull();
    expect(parseWorkoutAction('delete')).toBeNull();
    expect(parseWorkoutAction('')).toBeNull();
  });
});

describe('resolveDiscardLink', () => {
  it('asks only for the workout in progress (FR-21)', () => {
    expect(resolveDiscardLink('c1', 'c1')).toBe('confirm');
    expect(resolveDiscardLink('c1', ['c1'])).toBe('confirm');
  });

  it('touches nothing for an ended or another workout (EF-6)', () => {
    expect(resolveDiscardLink(null, 'c1')).toBe('ended');
    expect(resolveDiscardLink('c2', 'c1')).toBe('ended');
    expect(resolveDiscardLink('c1', undefined)).toBe('ended');
  });
});
