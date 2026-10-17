// Generates the app icon, Android adaptive icon, splash image and favicon
// (spec 0034 FR-1, FR-2) from the app's mark: the Ionicons "pulse" glyph of
// the sign-in screen, lime on the app's dark background. The PNGs are
// committed; run this again only to change the artwork.
//
//   PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node apps/mobile/scripts/brand-assets.mjs
//
// Needs Playwright with Chromium (here from the global npm install; it is not
// a dependency of the app).
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const app = join(here, '..');
const assets = join(app, 'assets');
const iconsDir = join(app, 'node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons');

// Same values as src/ui/tokens.ts (kept literal: this is a build script).
const BACKGROUND = '#101418';
const LIME = '#C8FF2E';

const glyph = String.fromCodePoint(
  JSON.parse(readFileSync(join(iconsDir, 'glyphmaps/Ionicons.json'), 'utf8')).pulse,
);
const font = readFileSync(join(iconsDir, 'Fonts/Ionicons.ttf')).toString('base64');

const requireGlobal = createRequire(`${execSync('npm root -g').toString().trim()}/`);
const { chromium } = requireGlobal('playwright');

/**
 * One square image: the glyph centred at `glyphRatio` of the side, thickened
 * by a stroke so it stays legible at the smallest system sizes.
 */
function page({ size, background, color, glyphRatio, strokeRatio }) {
  const glyphSize = Math.round(size * glyphRatio);
  const stroke = Math.max(1, Math.round(size * strokeRatio));
  return `<!doctype html><html><head><style>
    @font-face { font-family: Ionicons; src: url(data:font/ttf;base64,${font}); }
    html, body { margin: 0; width: ${size}px; height: ${size}px; background: ${background}; }
    body { display: flex; align-items: center; justify-content: center; }
    span { font-family: Ionicons; font-size: ${glyphSize}px; line-height: 1; color: ${color};
           -webkit-text-stroke: ${stroke}px ${color}; }
  </style></head><body><span>${glyph}</span></body></html>`;
}

const outputs = [
  // iOS / default icon: full-bleed dark square (iOS rounds the corners).
  { file: 'icon.png', size: 1024, background: BACKGROUND, color: LIME, glyphRatio: 0.62, strokeRatio: 0.012 },
  // Android adaptive icon: foreground inside the 66 % safe zone, on transparent;
  // the background colour is set in app.json.
  { file: 'adaptive-icon.png', size: 1024, background: 'transparent', color: LIME, glyphRatio: 0.5, strokeRatio: 0.01 },
  // Android 13 themed icon: the system tints this silhouette.
  { file: 'adaptive-icon-monochrome.png', size: 1024, background: 'transparent', color: '#FFFFFF', glyphRatio: 0.5, strokeRatio: 0.01 },
  // Splash: the mark alone; the splash plugin draws the background colour.
  { file: 'splash-icon.png', size: 1024, background: 'transparent', color: LIME, glyphRatio: 0.8, strokeRatio: 0.012 },
  { file: 'favicon.png', size: 48, background: BACKGROUND, color: LIME, glyphRatio: 0.72, strokeRatio: 0.03 },
];

const browser = await chromium.launch();
for (const output of outputs) {
  const tab = await browser.newPage({ viewport: { width: output.size, height: output.size } });
  await tab.setContent(page(output));
  await tab.evaluate(() => document.fonts.ready);
  await tab.screenshot({
    path: join(assets, output.file),
    omitBackground: output.background === 'transparent',
  });
  await tab.close();
  console.log('wrote', output.file);
}
await browser.close();
