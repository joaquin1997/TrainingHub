import { describe, expect, it } from 'vitest';

import appJson from '../../app.json';

declare global {
  interface ImportMeta {
    glob(patterns: string[], options: { eager: true; query: '?url'; import: 'default' }): Record<string, string>;
  }
}

/** The PNGs in `assets/`, keyed `./assets/name.png` as app.json writes them. */
const ASSETS = new Set(
  Object.keys(
    import.meta.glob(['../../assets/*.png'], { eager: true, query: '?url', import: 'default' }),
  ).map((path) => path.replace(/^\.\.\/\.\.\//, './')),
);

const expo = appJson.expo;
const splash = expo.plugins.find(
  (plugin) => Array.isArray(plugin) && plugin[0] === 'expo-splash-screen',
) as [string, { image: string; backgroundColor: string }] | undefined;

describe('brand and system appearance (spec 0034 FR-1 – FR-3, AC-1)', () => {
  it('has an icon, an adaptive icon and a favicon that exist', () => {
    for (const path of [
      expo.icon,
      expo.android.adaptiveIcon.foregroundImage,
      expo.android.adaptiveIcon.monochromeImage,
      expo.web.favicon,
    ]) {
      expect(ASSETS).toContain(path);
    }
  });

  it('shows the branded splash on the app background', () => {
    expect(splash).toBeDefined();
    expect(ASSETS).toContain(splash![1].image);
    expect(splash![1].backgroundColor).toBe(expo.backgroundColor);
    expect(expo.android.adaptiveIcon.backgroundColor).toBe(expo.backgroundColor);
  });

  it('declares the dark appearance to the system', () => {
    expect(expo.userInterfaceStyle).toBe('dark');
    expect(expo.ios.userInterfaceStyle).toBe('dark');
    expect(expo.android.userInterfaceStyle).toBe('dark');
  });
});
