import { describe, expect, it } from 'vitest';
import type { BodyMeasurementEntry } from '@workout/domain';

import {
  bmiBand,
  bodyMassIndex,
  changesOf,
  formatChange,
  formatMeasurement,
  fromDisplayValue,
  historyOf,
  latestByKind,
  toDisplayValue,
  waistToHeight,
} from './measurements';

function entry(id: string, measuredAt: string, values: Partial<BodyMeasurementEntry>): BodyMeasurementEntry {
  return { id, measuredAt, createdAt: measuredAt, updatedAt: measuredAt, ...values };
}

const weighIns = [
  entry('c', '2026-10-15T07:00:00.000Z', { weightKg: 82.4 }),
  entry('a', '2026-10-01T07:00:00.000Z', { weightKg: 84.0 }),
  entry('b', '2026-10-08T07:00:00.000Z', { weightKg: 83.1 }),
];

describe('BMI and waist-to-height', () => {
  it('computes BMI 25.4 from 82.4 kg and 180 cm, in the overweight band (AC-1)', () => {
    const bmi = bodyMassIndex(82.4, 180);
    expect(bmi).toBe(25.4);
    expect(bmiBand(bmi!)).toBe('overweight');
  });

  it('places the WHO band edges', () => {
    expect(bmiBand(18.4)).toBe('underweight');
    expect(bmiBand(18.5)).toBe('normal');
    expect(bmiBand(24.9)).toBe('normal');
    expect(bmiBand(30)).toBe('obese');
  });

  it('computes waist-to-height 0.49 from 88 cm and 180 cm (AC-3)', () => {
    expect(waistToHeight(88, 180)).toBe(0.49);
  });

  it('shows neither without a height (AC-4)', () => {
    expect(bodyMassIndex(82.4, null)).toBeNull();
    expect(waistToHeight(88, undefined)).toBeNull();
    expect(bodyMassIndex(undefined, 180)).toBeNull();
  });
});

describe('history and changes', () => {
  it('lists the three weigh-ins oldest first with −0.7 and −1.6 kg changes (AC-2)', () => {
    const points = historyOf(weighIns, 'weightKg');
    expect(points.map((point) => point.value)).toEqual([84.0, 83.1, 82.4]);

    const changes = changesOf(points)!;
    expect(formatChange('weightKg', changes.sincePrevious, 'kg')).toBe('−0.7 kg');
    expect(formatChange('weightKg', changes.sinceFirst, 'kg')).toBe('−1.6 kg');
  });

  it('has no change with a single entry (EF-4)', () => {
    expect(changesOf(historyOf(weighIns.slice(0, 1), 'weightKg'))).toBeNull();
  });

  it('leaves the weight history alone for a waist and body-fat entry (AC-3)', () => {
    const entries = [...weighIns, entry('d', '2026-10-16T07:00:00.000Z', { waistCm: 88, bodyFatPercent: 18 })];

    expect(historyOf(entries, 'weightKg')).toHaveLength(3);
    const latest = latestByKind(entries);
    expect(latest.weightKg?.value).toBe(82.4);
    expect(latest.waistCm?.value).toBe(88);
    expect(formatMeasurement('bodyFatPercent', latest.bodyFatPercent!.value, 'kg')).toBe('18 %');
    expect(latest.chestCm).toBeUndefined();
  });

  it('takes the later of two same-day entries as the latest (EF-3)', () => {
    const entries = [
      entry('evening', '2026-10-16T19:00:00.000Z', { weightKg: 83 }),
      entry('morning', '2026-10-16T07:00:00.000Z', { weightKg: 82 }),
    ];

    expect(historyOf(entries, 'weightKg')).toHaveLength(2);
    expect(latestByKind(entries).weightKg?.entryId).toBe('evening');
  });
});

describe('display units', () => {
  it('shows 82.4 kg as 181.7 lb and waist 88 cm as 34.6 in (AC-1)', () => {
    expect(formatMeasurement('weightKg', 82.4, 'lb')).toBe('181.7 lb');
    expect(formatMeasurement('waistCm', 88, 'lb')).toBe('34.6 in');
    expect(formatMeasurement('bodyFatPercent', 18, 'lb')).toBe('18 %');
  });

  it('round-trips a typed display value to canonical units', () => {
    expect(fromDisplayValue('weightKg', 181.7, 'lb')).toBeCloseTo(82.42, 2);
    expect(fromDisplayValue('waistCm', 34.6, 'lb')).toBeCloseTo(87.88, 2);
    expect(fromDisplayValue('musclePercent', 40, 'lb')).toBe(40);
    expect(toDisplayValue('weightKg', 82.4, 'kg')).toBe(82.4);
  });

  it('keeps two decimals of body weight in kg (spec 0040 FR-7)', () => {
    expect(toDisplayValue('weightKg', 78.35, 'kg')).toBe(78.35);
    expect(formatMeasurement('weightKg', 78.354, 'kg')).toBe('78.35 kg');
    expect(toDisplayValue('waistCm', 88.25, 'kg')).toBe(88.3);
  });

  it('signs positive changes and leaves zero bare', () => {
    expect(formatChange('waistCm', 1.2, 'kg')).toBe('+1.2 cm');
    expect(formatChange('weightKg', 0, 'kg')).toBe('0 kg');
  });
});
