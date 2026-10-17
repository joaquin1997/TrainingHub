/**
 * WCAG 2.x contrast for the palette (spec 0034 FR-16, AC-7). Colours are
 * `#RRGGBB` or `rgba(r, g, b, a)`; a translucent tint is composited over the
 * surface it is drawn on before its contrast is measured.
 */
type Rgb = [number, number, number];

function parse(colour: string): { rgb: Rgb; alpha: number } {
  const hex = /^#([0-9a-f]{6})$/i.exec(colour);
  if (hex) {
    const value = hex[1]!;
    return {
      rgb: [0, 2, 4].map((at) => parseInt(value.slice(at, at + 2), 16)) as Rgb,
      alpha: 1,
    };
  }
  const rgba = /^rgba?\(\s*(\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\s*\)$/i.exec(colour);
  if (rgba) {
    return {
      rgb: [Number(rgba[1]), Number(rgba[2]), Number(rgba[3])],
      alpha: rgba[4] === undefined ? 1 : Number(rgba[4]),
    };
  }
  throw new Error(`Unsupported colour: ${colour}`);
}

function toHex(rgb: Rgb): string {
  return `#${rgb.map((channel) => Math.round(channel).toString(16).padStart(2, '0')).join('')}`;
}

/** The opaque colour seen when `colour` (possibly translucent) is drawn over `base`. */
export function composite(colour: string, base: string): string {
  const top = parse(colour);
  const bottom = parse(base);
  return toHex(
    top.rgb.map((channel, index) => top.alpha * channel + (1 - top.alpha) * bottom.rgb[index]!) as Rgb,
  );
}

function channelLuminance(channel: number): number {
  const value = channel / 255;
  return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

export function relativeLuminance(colour: string): number {
  const [r, g, b] = parse(colour).rgb.map(channelLuminance) as Rgb;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Contrast ratio of two opaque colours, 1 – 21. */
export function contrastRatio(foreground: string, background: string): number {
  const [light, dark] = [relativeLuminance(foreground), relativeLuminance(background)].sort(
    (left, right) => right - left,
  ) as [number, number];
  return (light + 0.05) / (dark + 0.05);
}
