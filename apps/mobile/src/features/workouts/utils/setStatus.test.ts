import { describe, expect, it } from 'vitest';

import { isStatusChecked, setStatus, setStatusLabel } from './setStatus';

const t = (key: string) => key;

describe('setStatus (spec 0034 FR-19, AC-13)', () => {
  it('shows the record, not two marks, for a done set that earned one', () => {
    expect(setStatus({ done: true }, { hasRecord: true, isUpNext: false })).toBe('record');
  });

  it('shows done for a done set without a record', () => {
    expect(setStatus({ done: true }, { hasRecord: false, isUpNext: false })).toBe('done');
  });

  it('shows up next for the set to do now', () => {
    expect(setStatus({ done: false }, { hasRecord: false, isUpNext: true })).toBe('upNext');
  });

  it('shows the mark of an undone generated warm-up', () => {
    expect(
      setStatus({ done: false, generatedWarmup: true }, { hasRecord: false, isUpNext: false }),
    ).toBe('generatedWarmup');
  });

  it('shows done for a generated warm-up once ticked', () => {
    expect(
      setStatus({ done: true, generatedWarmup: true }, { hasRecord: false, isUpNext: false }),
    ).toBe('done');
  });

  it('keeps the warm-up mark when that warm-up is also up next (priority)', () => {
    expect(
      setStatus({ done: false, generatedWarmup: true }, { hasRecord: false, isUpNext: true }),
    ).toBe('generatedWarmup');
  });

  it('shows nothing for any other set', () => {
    expect(setStatus({ done: false }, { hasRecord: false, isUpNext: false })).toBe('none');
  });

  it('never shows a record on a set that is not done', () => {
    expect(setStatus({ done: false }, { hasRecord: true, isUpNext: false })).toBe('none');
  });

  it('is checked exactly for done and record', () => {
    expect(isStatusChecked('record')).toBe(true);
    expect(isStatusChecked('done')).toBe(true);
    expect(isStatusChecked('generatedWarmup')).toBe(false);
    expect(isStatusChecked('upNext')).toBe(false);
    expect(isStatusChecked('none')).toBe(false);
  });

  it('says each status in words', () => {
    expect(setStatusLabel('record', t)).toBe('workouts.setStatus.record');
    expect(setStatusLabel('done', t)).toBe('workouts.setStatus.done');
    expect(setStatusLabel('generatedWarmup', t)).toBe('workouts.setStatus.generatedWarmup');
    expect(setStatusLabel('upNext', t)).toBe('workouts.setStatus.upNext');
    expect(setStatusLabel('none', t)).toBe('workouts.setStatus.none');
  });
});
