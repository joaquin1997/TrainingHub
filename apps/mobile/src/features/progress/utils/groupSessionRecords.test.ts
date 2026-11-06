import { describe, expect, it } from 'vitest';
import type { SessionRecord } from '@workout/domain';
import { groupSessionRecords, groupedRecordCount, type SummaryRecord } from './groupSessionRecords';
import { describeRecord } from './recordLabels';
import { createProgressResource } from './progressResource';
import { shouldCelebrate } from '@/features/workouts/utils/celebration';
import { en } from '@/i18n/locales/en';
import { es } from '@/i18n/locales/es';
import i18next from 'i18next';
const date = '2026-11-04T10:00:00Z';
const record = (exerciseId: string, type: SessionRecord['type'], value: number, extra: Partial<SessionRecord> = {}): SessionRecord => ({
  exerciseId, exerciseName: exerciseId, type, value, date, ...extra,
});
const exercises = [
  { exerciseId: 'squat', exerciseName: 'Squat', order: 1 },
  { exerciseId: 'bench', exerciseName: 'Bench', order: 2 },
  { exerciseId: 'squat', exerciseName: 'Squat again', order: 3 },
];
const records = [record('bench', 'bestEstimatedOneRepMax', 120, { weightKg: 100, reps: 6 }),
  record('squat', 'bestSetVolume', 600, { weightKg: 100, reps: 6 }),
  record('bench', 'bestSetVolume', 500, { weightKg: 100, reps: 5 }),
  record('squat', 'heaviestWeight', 100, { reps: 6 }), record('bench', 'heaviestWeight', 100, { reps: 5 })];
describe('exercise-grouped saved records (0053)', () => {
  it('groups all 3+2 records in first saved occurrence order with established type priority', () => {
    const groups = groupSessionRecords(records, exercises);
    expect(groups.map((group) => [group.exerciseId, group.exerciseName, group.records.length])).toEqual([['squat', 'Squat', 2], ['bench', 'Bench', 3]]);
    expect(groups[1]!.records.map((row) => row.type)).toEqual(['heaviestWeight', 'bestSetVolume', 'bestEstimatedOneRepMax']);
    expect(groupedRecordCount(groups)).toBe(5);
    expect(groups.flatMap((group) => group.records)).toEqual(expect.arrayContaining(records));
  });
  it('never merges distinct identities sharing a displayed name or duplicates one repeated occurrence', () => {
    const sameName = exercises.map((exercise) => ({ ...exercise, exerciseName: 'Press' }));
    const groups = groupSessionRecords(records.map((row) => ({ ...row, exerciseName: 'Press' })), sameName);
    expect(groups).toHaveLength(2); expect(groups.every((group) => group.exerciseName === 'Press')).toBe(true);
    expect(new Set(groups.map((group) => group.exerciseId)).size).toBe(2);
  });
  it('retains unknown/retired exercise names and response encounter order after known IDs', () => {
    const groups = groupSessionRecords([record('retired-b', 'mostReps', 10, { exerciseName: 'Saved retired name' }), ...records, record('retired-a', 'longestTime', 40)], exercises);
    expect(groups.map((group) => group.exerciseId)).toEqual(['squat', 'bench', 'retired-b', 'retired-a']);
    expect(groups[2]!.exerciseName).toBe('Saved retired name');
  });
  it('preserves supporting sets, dates, distinct same-type entries and stable ties without mutation', () => {
    const old = record('bench', 'repsAtWeight', 8, { weightKg: 80, date: '2026-11-01T10:00:00Z' });
    const recent = record('bench', 'repsAtWeight', 5, { weightKg: 100 });
    const tied = { ...recent, weightKg: 110 };
    const source = Object.freeze([old, recent, tied]);
    source.forEach(Object.freeze);
    const groups = groupSessionRecords(source, Object.freeze([...exercises]));
    expect(groups[0]!.records).toEqual([recent, tied, old]);
    expect(groups[0]!.records[0]).toBe(recent);
    expect(source[0]).toBe(old); expect(exercises[0]!.order).toBe(1);
  });
  it('uses saved order even when its input array is out of order', () => {
    expect(groupSessionRecords(records, [...exercises].reverse()).map((group) => group.exerciseId)).toEqual(['squat', 'bench']);
  });
  it('has no invented groups and excludes improvement-only feedback from PR counts', () => {
    expect(groupSessionRecords([], exercises)).toEqual([]);
    const mixed: SummaryRecord[] = [record('bench', 'heaviestWeight', 100), record('bench', 'bestSetVolume', 500),
      { ...record('squat', 'heaviestWeight', 47), baselineScope: 'lastSession' }];
    const groups = groupSessionRecords(mixed, exercises);
    expect(groupedRecordCount(groups)).toBe(2); expect(groups.map((group) => group.exerciseId)).toEqual(['bench']);
  });
  it.each(['en', 'es'])('reuses type/value/unit/support formatting in %s without altering canonical records', async (language) => {
    const i18n = i18next.createInstance();
    await i18n.init({ lng: language, resources: { en: { translation: en }, es: { translation: es } } });
    const group = groupSessionRecords(records, exercises)[0]!;
    const translate = (key: string, options?: Record<string, unknown>) => String(i18n.t(key, options));
    const kg = describeRecord(group.records[0]!, 'kg', translate);
    const lb = describeRecord(group.records[0]!, 'lb', translate);
    expect(kg.value).toContain('100 kg'); expect(lb.value).toContain('220.5 lb');
    expect(kg.title).not.toContain('progress.'); expect(translate('progress.records.count', { count: 2 })).toContain('2');
    expect(group.records[0]!.value).toBe(100);
  });
  it('keeps loaded groups on retry failure, distinguishes successful empty and preserves celebration identity', async () => {
    let response: 'loaded' | 'error' | 'empty' = 'loaded';
    const resource = createProgressResource(async () => { if (response === 'error') throw new Error('offline'); return { records: response === 'empty' ? [] : records, exercises }; });
    await resource.load();
    const loaded = resource.getSnapshot().data!;
    response = 'error'; await resource.load();
    expect(resource.getSnapshot().error).toBeDefined(); expect(resource.getSnapshot().data).toBe(loaded);
    const count = groupedRecordCount(groupSessionRecords(loaded.records, loaded.exercises));
    expect(count).toBe(5);
    expect(shouldCelebrate({ workoutId: 'same-workout', recordCount: count, inFront: true, celebrated: ['same-workout'] })).toBe(false);
    response = 'empty'; await resource.load();
    expect(resource.getSnapshot().error).toBeUndefined();
    expect(groupSessionRecords(resource.getSnapshot().data!.records, exercises)).toEqual([]);
  });
});
