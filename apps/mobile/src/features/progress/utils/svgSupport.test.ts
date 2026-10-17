import { describe, expect, it } from 'vitest';

import { canDrawSvg, SVG_PATH_VIEW } from './svgSupport';

describe('canDrawSvg (old binary guard)', () => {
  const registry = (known: string[]) => ({
    hasViewManagerConfig: (name: string) => known.includes(name),
  });

  it('always draws on web', () => {
    expect(canDrawSvg('web', undefined)).toBe(true);
  });

  it('draws when the binary has the native SVG path view', () => {
    expect(canDrawSvg('ios', registry([SVG_PATH_VIEW]))).toBe(true);
    expect(canDrawSvg('android', registry(['RCTView', SVG_PATH_VIEW]))).toBe(true);
  });

  it('falls back when the view is unknown (binary built before the module)', () => {
    expect(canDrawSvg('ios', registry(['RCTView']))).toBe(false);
  });

  it('falls back instead of throwing when the check itself fails', () => {
    const throwing = {
      hasViewManagerConfig: () => {
        throw new Error('no interop layer');
      },
    };

    expect(canDrawSvg('android', throwing)).toBe(false);
    expect(canDrawSvg('ios', {})).toBe(false);
    expect(canDrawSvg('ios', undefined)).toBe(false);
  });
});
