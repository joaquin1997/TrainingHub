import { describe, expect, it } from 'vitest';
import { approachSets, requestedApproachCount } from './approachSets';
import { DEFAULT_WARM_UP_PREFERENCES as defaults, inferLoadingKind, isWarmUpPreferences, resolveWarmUpContext } from './warmUpContext';
import { toKg } from './weight';

describe('personal warm-up contexts and ramps', () => {
  it('uses reviewed loading metadata, then whole-word multilingual names, then equipment', () => {
    expect(inferLoadingKind({ name: 'Barbell machine press' })).toBe('machine');
    expect(inferLoadingKind({ name: 'Press con mancuernas' })).toBe('dumbbell');
    expect(inferLoadingKind({ name: 'Polea', loadingKind: 'barbell' })).toBe('barbell');
    expect(inferLoadingKind({ name: 'Unknown', equipment: ['dumbbell'] })).toBe('dumbbell');
    expect(inferLoadingKind({ name: 'Barbarian curl' })).toBe('machine');
    expect(inferLoadingKind({})).toBe('machine');
  });
  it('does not introduce a bar floor for dumbbells or machines and respects their steps', () => {
    const db = resolveWarmUpContext({ name: 'Dumbbell press', category: 'chest' }, [], 'kg');
    expect(approachSets(32.5, 'kg', db)).toEqual([{ weight: 17.5, reps: 8 }, { weight: 22.5, reps: 5 }, { weight: 27.5, reps: 2 }]);
    const machine = resolveWarmUpContext({ loadingKind: 'machine', category: 'back' }, [], 'kg');
    expect(approachSets(60, 'kg', machine)).toEqual([{ weight: 30, reps: 8 }, { weight: 40, reps: 5 }, { weight: 50, reps: 2 }]);
  });
  it('shortens only matching primary muscles/categories, not secondary or merely same-size groups', () => {
    const chest = { primaryMuscleGroups: ['chest'], loadingKind: 'machine' as const };
    expect(requestedApproachCount(resolveWarmUpContext(chest, [chest], 'kg'))).toBe(2);
    expect(requestedApproachCount(resolveWarmUpContext(chest, [{ category: 'back' }], 'kg'))).toBe(3);
    expect(resolveWarmUpContext({ primaryMuscleGroups: ['lats'], category: 'Back' }, [{ primaryMuscleGroups: ['lower back'], category: 'Back' }], 'kg').alreadyWorked).toBe(false);
    expect(resolveWarmUpContext({ primaryMuscleGroups: ['lats'], category: 'Back' }, [{ category: 'Back' }], 'kg').alreadyWorked).toBe(true);
    const curls = { primaryMuscleGroups: ['biceps'], loadingKind: 'barbell' as const };
    expect(requestedApproachCount(resolveWarmUpContext(curls, [], 'kg'))).toBe(2);
    expect(requestedApproachCount(resolveWarmUpContext(curls, [curls], 'kg'))).toBe(1);
    expect(resolveWarmUpContext({}, [{}], 'kg')).toMatchObject({ muscleSize: 'large', alreadyWorked: false });
  });
  it('supports each explicit count, while rounding may reduce a light ramp without duplicates', () => {
    for (const count of [1, 2, 3, 4, 5] as const) {
      const options = resolveWarmUpContext({ loadingKind: 'barbell' }, [], 'kg', { ...defaults, approachSetCount: count });
      const sets = approachSets(140, 'kg', options);
      expect(sets).toHaveLength(count);
      expect(sets.every((set, i) => set.weight < 140 && (!i || set.weight >= sets[i - 1]!.weight + 2.5))).toBe(true);
    }
    const small = approachSets(10, 'kg', { loadingKind: 'machine', count: 5, increment: 2.5 });
    expect(small.length).toBeLessThan(5);
    expect(new Set(small.map((set) => set.weight)).size).toBe(small.length);
    expect(approachSets(Infinity, 'kg')).toEqual([]);
    expect(approachSets(100, 'kg', { loadingKind: 'machine', increment: 0 })).toEqual([]);
  });
  it('uses cable 2.5/5 kg choices and preserves a custom physical step across kg/lb conversion', () => {
    const metadata = { loadingKind: 'machine' as const };
    const p = { ...defaults, incrementKg: 2.5 };
    expect(approachSets(60, 'kg', resolveWarmUpContext(metadata, [], 'kg', p)).map((s) => s.weight)).toEqual([30, 42.5, 50]);
    const options = resolveWarmUpContext(metadata, [], 'lb', p);
    const sets = approachSets(132.3, 'lb', options);
    expect(sets.every((s) => Math.abs(toKg(s.weight, 'lb') / 2.5 - Math.round(toKg(s.weight, 'lb') / 2.5)) < 1e-7)).toBe(true);
    expect(approachSets(132.3, 'lb', options)).toEqual(sets);
  });
  it('uses EZ bars only for barbell and does not lose personal overrides to catalog defaults', () => {
    const ez = resolveWarmUpContext({ name: 'EZ bar curl', category: 'back' }, [], 'lb');
    expect(approachSets(100, 'lb', ez)[0]?.weight).toBe(25);
    const p = { ...defaults, loadingKind: 'machine' as const };
    expect(resolveWarmUpContext({ loadingKind: 'barbell' }, [], 'kg', p).loadingKind).toBe('machine');
    expect(isWarmUpPreferences({ ...p, approachSetCount: 6 })).toBe(false);
    expect(isWarmUpPreferences({ ...p, incrementKg: NaN })).toBe(false);
    expect(isWarmUpPreferences(defaults)).toBe(true);
  });
});
