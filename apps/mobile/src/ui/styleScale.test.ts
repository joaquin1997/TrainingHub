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

  it("requires every text input to ask for the theme's keyboard (spec 0038 AC-3)", () => {
    const found = scanStyleSource(
      [
        '<TextInput value={a} onChangeText={(v) => set(v)} />',
        '<TextInput',
        '  keyboardAppearance="dark"',
        '  onChangeText={(v) => set(v)}',
        '/>',
        '<TextInput keyboardAppearance={keyboardAppearance()} />',
      ].join('\n'),
    );

    expect(found).toEqual([
      { kind: 'keyboard', line: 1, text: '<TextInput without keyboardAppearance' },
      { kind: 'keyboard', line: 2, text: '<TextInput with a fixed keyboardAppearance' },
    ]);
  });

  it('fails on a fixed status bar style (spec 0038 AC-3)', () => {
    expect(scanStyleSource('<StatusBar style="light" />')).toEqual([
      { kind: 'statusBar', line: 1, text: '<StatusBar with a fixed style' },
    ]);
    expect(scanStyleSource("<StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />")).toEqual([]);
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
      for (const v of scanStyleSource(source)) {
        report.push(`${file}:${v.line} [${v.kind}] ${v.text}`);
      }
    }

    expect(report).toEqual([]);
  });
});
