import { describe, expect, it } from 'vitest';

import { scanStyleSource } from './styleScale';
import { typeScale } from './tokens';

// Vite's raw glob import (no Node types in this app).
declare global {
  interface ImportMeta {
    glob(
      patterns: string[],
      options: { query: '?raw'; import: 'default'; eager: true },
    ): Record<string, string>;
  }
}

/** Every source file under `src/`, keyed `features/…/File.tsx`. */
const SOURCES = Object.fromEntries(
  Object.entries(
    import.meta.glob(['../**/*.ts', '../**/*.tsx', '!../**/*.test.ts'], {
      query: '?raw',
      import: 'default',
      eager: true,
    }),
  ).map(([path, source]) => [path.replace(/^\.\.\//, '').replace(/^\.\//, 'ui/'), source]),
);

/** The one file allowed to write the values (spec 0034 FR-10 – FR-12). */
const TOKENS = 'ui/tokens.ts';

/**
 * Files still being moved onto the scales, with the number of violations each
 * may still have. Shrinks with every migration commit; must end empty.
 */
const BASELINE: Record<string, number> = {
  'features/exercises/components/CustomExerciseForm.tsx': 2,
  'features/exercises/components/CustomExerciseModal.tsx': 1,
  'features/exercises/components/ExercisePhotoField.tsx': 1,
  'features/exercises/components/ExercisePickerModal.tsx': 12,
  'features/exercises/components/TrackingTypeControl.tsx': 1,
  'features/exercises/components/UnilateralSwitch.tsx': 1,
  'features/exercises/screens/ExerciseDetailScreen.tsx': 4,
  'features/exercises/screens/ExercisesListScreen.tsx': 8,
  'features/profile/components/ProfileAvatar.tsx': 2,
  'features/profile/components/UnitInput.tsx': 1,
  'features/profile/screens/MeasurementEntryScreen.tsx': 2,
  'features/profile/screens/MeasurementHistoryScreen.tsx': 1,
  'features/profile/screens/ProfileEditScreen.tsx': 3,
  'features/profile/screens/ProfileScreen.tsx': 4,
  'features/progress/components/MuscleDistribution.tsx': 4,
  'features/progress/components/ProgressChart.tsx': 3,
  'features/progress/components/RecordsCard.tsx': 5,
  'features/progress/components/TimedProgress.tsx': 7,
  'features/progress/screens/ExerciseProgressDetailScreen.tsx': 9,
  'features/progress/screens/ProgressOverviewScreen.tsx': 6,
  'features/routines/components/RoutineSetTable.tsx': 5,
  'features/routines/components/WarmUpBlockEditor.tsx': 2,
  'features/routines/screens/RoutineDetailScreen.tsx': 15,
  'features/routines/screens/RoutineFormScreen.tsx': 17,
  'features/routines/screens/RoutinesListScreen.tsx': 2,
  'features/settings/screens/SettingsScreen.tsx': 11,
  'features/workouts/components/ApproachSetsPreviewSheet.tsx': 7,
  'features/workouts/components/ProgressRing.tsx': 1,
  'features/workouts/components/RestBar.tsx': 4,
  'features/workouts/components/RestEditorSheet.tsx': 8,
  'features/workouts/components/WarmUpActionButton.tsx': 1,
  'features/workouts/components/WarmUpChecklist.tsx': 2,
  'features/workouts/components/WheelPicker.tsx': 1,
  'features/workouts/components/WorkoutBar.tsx': 6,
  'features/workouts/components/WorkoutSetRow.tsx': 18,
  'features/workouts/liveRecords/RecordNotice.tsx': 2,
  'features/workouts/screens/ActiveWorkoutScreen.tsx': 25,
  'features/workouts/screens/WorkoutHistoryScreen.tsx': 6,
  'features/workouts/screens/WorkoutSessionDetailScreen.tsx': 6,
  'features/workouts/screens/WorkoutSummaryScreen.tsx': 3,
};

describe('scanStyleSource', () => {
  it('flags numeric sizes, radii and spacing, and accepts tokens and zero', () => {
    const found = scanStyleSource(
      [
        'const styles = {',
        '  a: { fontSize: 13, lineHeight: typeScale.caption.lineHeight },',
        '  b: { borderRadius: 4, borderTopLeftRadius: radii.sm },',
        '  c: { paddingTop: insets.top + 8, margin: 0, gap: spacing.xs },',
        '  d: { marginLeft: -spacing.xs, paddingVertical: 0.5 },',
        '  e: { fontSize: compact ? typeScale.body.fontSize : 18 },',
        '};',
      ].join('\n'),
    );

    expect(found.map((v) => [v.kind, v.line])).toEqual([
      ['type', 2],
      ['radius', 3],
      ['spacing', 4],
      ['spacing', 5],
      ['type', 6],
    ]);
  });

  it('flags colour literals but not transparent', () => {
    const found = scanStyleSource(
      [
        "a = { color: '#fff' };",
        "b = { backgroundColor: 'rgba(0, 0, 0, 0.5)' };",
        "c = <Icon color=\"white\" />;",
        "d = { backgroundColor: 'transparent', color: colors.text };",
        "// a comment about '#123456' is fine",
      ].join('\n'),
    );

    expect(found.map((v) => [v.kind, v.line])).toEqual([
      ['colour', 1],
      ['colour', 2],
      ['colour', 3],
    ]);
  });

  it('requires the dark keyboard on every text input', () => {
    const found = scanStyleSource(
      [
        '<TextInput value={a} onChangeText={(v) => set(v)} />',
        '<TextInput',
        '  keyboardAppearance="dark"',
        '  onChangeText={(v) => set(v)}',
        '/>',
      ].join('\n'),
    );

    expect(found).toEqual([
      { kind: 'keyboard', line: 1, text: '<TextInput without keyboardAppearance' },
    ]);
  });
});

describe('closed scales (spec 0034 AC-5, AC-6)', () => {
  it('has exactly six text styles, the smallest being Caption', () => {
    expect(Object.keys(typeScale).sort()).toEqual(
      ['body', 'caption', 'figure', 'figureLarge', 'heading', 'title'].sort(),
    );
    const sizes = Object.values(typeScale).map((style) => style.fontSize);
    expect(Math.min(...sizes)).toBe(typeScale.caption.fontSize);
  });

  it('no screen writes a size, radius, spacing or colour outside the tokens', () => {
    const report: string[] = [];

    expect(Object.keys(SOURCES).length).toBeGreaterThan(100);

    for (const [file, source] of Object.entries(SOURCES)) {
      if (file === TOKENS) {
        continue;
      }
      const violations = scanStyleSource(source);
      const allowed = BASELINE[file] ?? 0;
      if (violations.length > allowed) {
        report.push(
          `${file}: ${violations.length} (allowed ${allowed})`,
          ...violations.map((v) => `  ${v.line} [${v.kind}] ${v.text}`),
        );
      }
    }

    expect(report).toEqual([]);
  });

  it('keeps the migration baseline honest', () => {
    const stale = Object.entries(BASELINE).filter(([file, allowed]) => {
      const source = SOURCES[file];
      return source === undefined || scanStyleSource(source).length < allowed;
    });

    expect(stale.map(([file]) => file)).toEqual([]);
  });
});
