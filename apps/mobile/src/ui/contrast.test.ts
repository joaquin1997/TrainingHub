import { describe, expect, it } from 'vitest';

import { composite, contrastRatio } from './contrast';
import { palettes } from './tokens';

const colors = palettes.dark;

/** Every surface text is drawn on; tints are composited over the card. */
const SURFACES = {
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

/** Text colours drawn on the surfaces above (small text: 4.5:1). */
const TEXT_ON_SURFACES = {
  text: colors.text,
  textMuted: colors.textMuted,
  textSubtle: colors.textSubtle,
  primary: colors.primary,
  accent: colors.accent,
  success: colors.success,
  danger: colors.danger,
};

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

describe('palette contrast (spec 0034 FR-16, AC-7)', () => {
  for (const [textName, text] of Object.entries(TEXT_ON_SURFACES)) {
    for (const [surfaceName, surface] of Object.entries(SURFACES)) {
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
});

describe('set status area contrast (spec 0034 FR-16, FR-19)', () => {
  it('the trophy and check on the record and done fills are at least 3:1', () => {
    expect(contrastRatio(colors.onPrimary, colors.accent)).toBeGreaterThanOrEqual(3);
    expect(contrastRatio(colors.onPrimary, colors.success)).toBeGreaterThanOrEqual(3);
  });

  it('the up-next and warm-up outlines are at least 3:1 against the area and the card', () => {
    for (const outline of [colors.primary, colors.accent]) {
      expect(contrastRatio(outline, colors.surfaceRaised)).toBeGreaterThanOrEqual(3);
      expect(contrastRatio(outline, colors.surface)).toBeGreaterThanOrEqual(3);
    }
  });

  it('the record and done fills stand out from the done row tint at 3:1', () => {
    const doneTint = composite(colors.successSoft, colors.surface);
    expect(contrastRatio(colors.accent, doneTint)).toBeGreaterThanOrEqual(3);
    expect(contrastRatio(colors.success, doneTint)).toBeGreaterThanOrEqual(3);
  });
});
