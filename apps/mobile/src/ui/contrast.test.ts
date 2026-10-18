import { describe, expect, it } from 'vitest';

import { composite, contrastRatio } from './contrast';
import { palettes, type Palette } from './tokens';

describe('contrast helpers', () => {
  it('matches known WCAG ratios', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 5);
    expect(contrastRatio('#777777', '#FFFFFF')).toBeCloseTo(4.48, 2);
  });

  it('composites a translucent tint over its surface', () => {
    expect(composite('rgba(255, 255, 255, 0.5)', '#000000')).toBe('#808080');
    expect(composite('#123456', '#FFFFFF')).toBe('#123456');
  });
});

describe('both themes have every token (spec 0038 AC-2)', () => {
  it('has the same keys in dark and light', () => {
    expect(Object.keys(palettes.light).sort()).toEqual(Object.keys(palettes.dark).sort());
  });

  it('keeps the ink shades equal to the fills on dark (FR-8)', () => {
    const dark = palettes.dark;
    expect([dark.primaryInk, dark.accentInk, dark.successInk, dark.dangerInk]).toEqual([
      dark.primary,
      dark.accent,
      dark.success,
      dark.danger,
    ]);
  });

  it('keeps the brand lime fill and its dark text in both themes (FR-8, AC-14)', () => {
    expect(palettes.light.primary).toBe(palettes.dark.primary);
    expect(palettes.light.onPrimary).toBe(palettes.dark.onPrimary);
  });
});

/** Every surface text is drawn on; tints are composited over the card. */
function surfacesOf(colors: Palette) {
  return {
    background: colors.background,
    surface: colors.surface,
    surfaceRaised: colors.surfaceRaised,
    surfaceMuted: colors.surfaceMuted,
    doneTint: composite(colors.successSoft, colors.surface),
    doneTintOnBackground: composite(colors.successSoft, colors.background),
    recordTint: composite(colors.accentSoft, colors.surface),
    limeSoft: composite(colors.primarySoft, colors.surface),
    dangerSoft: composite(colors.dangerSoft, colors.surface),
  };
}

/** Text colours drawn on the surfaces above (small text: 4.5:1). */
function textsOf(colors: Palette) {
  return {
    text: colors.text,
    textMuted: colors.textMuted,
    textSubtle: colors.textSubtle,
    primaryInk: colors.primaryInk,
    accentInk: colors.accentInk,
    successInk: colors.successInk,
    dangerInk: colors.dangerInk,
  };
}

for (const [theme, colors] of Object.entries(palettes)) {
  describe(`${theme} palette contrast (spec 0034 FR-16, 0038 FR-10, AC-1)`, () => {
    for (const [textName, text] of Object.entries(textsOf(colors))) {
      for (const [surfaceName, surface] of Object.entries(surfacesOf(colors))) {
        it(`${textName} on ${surfaceName} is at least 4.5:1`, () => {
          expect(contrastRatio(text, surface)).toBeGreaterThanOrEqual(4.5);
        });
      }
    }

    it('text on the lime and green fills is at least 4.5:1', () => {
      expect(contrastRatio(colors.onPrimary, colors.primary)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(colors.onPrimary, colors.success)).toBeGreaterThanOrEqual(4.5);
    });

    it('the undone done box outline is at least 3:1 against its fill and the card', () => {
      expect(contrastRatio(colors.controlBorder, colors.surfaceRaised)).toBeGreaterThanOrEqual(3);
      expect(contrastRatio(colors.controlBorder, colors.surface)).toBeGreaterThanOrEqual(3);
    });

    it('subtle text stays dimmer than muted text', () => {
      expect(contrastRatio(colors.textSubtle, colors.surface)).toBeLessThan(
        contrastRatio(colors.textMuted, colors.surface),
      );
    });

    it('the trophy and check on the record and done fills are at least 3:1', () => {
      expect(contrastRatio(colors.onPrimary, colors.accent)).toBeGreaterThanOrEqual(3);
      expect(contrastRatio(colors.onPrimary, colors.success)).toBeGreaterThanOrEqual(3);
    });

    it('the up-next and warm-up outlines are at least 3:1 against the area and the card', () => {
      for (const outline of [colors.primaryInk, colors.accentInk]) {
        expect(contrastRatio(outline, colors.surfaceRaised)).toBeGreaterThanOrEqual(3);
        expect(contrastRatio(outline, colors.surface)).toBeGreaterThanOrEqual(3);
      }
    });

    it('the record and done fills stand out from the done row tint at 3:1', () => {
      const doneTint = composite(colors.successSoft, colors.surface);
      expect(contrastRatio(colors.accent, doneTint)).toBeGreaterThanOrEqual(3);
      expect(contrastRatio(colors.success, doneTint)).toBeGreaterThanOrEqual(3);
    });

    it('chart line and points are at least 3:1 on the card (FR-14, AC-11)', () => {
      expect(contrastRatio(colors.primaryInk, colors.surface)).toBeGreaterThanOrEqual(3);
      expect(contrastRatio(colors.accentInk, colors.surface)).toBeGreaterThanOrEqual(3);
    });
  });
}
