// Generates the app icon, Android adaptive icon, splash image and favicon
// (spec 0034 FR-1, FR-2) from the app's mark: the Ionicons "pulse" glyph of
// the sign-in screen, lime on the app's dark background. The PNGs are
// committed; run this again only to change the artwork.
//
//   PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node apps/mobile/scripts/brand-assets.mjs
//   node apps/mobile/scripts/brand-assets.mjs icon-dark.png icon-tinted.png
//
// Needs Playwright with Chromium (here from the global npm install; it is not
// a dependency of the app); without it, the system Google Chrome's headless
// screenshot is used. File names as arguments render only those.
import { execFileSync, execSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
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
let chromium = null;
try {
  ({ chromium } = requireGlobal('playwright'));
} catch {
  // Falls back to the system Chrome below.
}
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

/**
 * One square image: the glyph centred at `glyphRatio` of the side, thickened
 * by a stroke so it stays legible at the smallest system sizes.
 */
function page({ size, background, color, glyphRatio, strokeRatio }) {
  const glyphSize = Math.round(size * glyphRatio);
  const stroke = Math.max(1, Math.round(size * strokeRatio));
  return `<!doctype html><html><head><meta charset="utf-8"><style>
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
  // iOS 18 dark icon (spec 0035 FR-24): the mark on transparent; the system
  // draws its dark ground, so there is no light square.
  { file: 'icon-dark.png', size: 1024, background: 'transparent', color: LIME, glyphRatio: 0.62, strokeRatio: 0.012 },
  // iOS 18 tinted icon: a single-tone mark the system tints.
  { file: 'icon-tinted.png', size: 1024, background: 'transparent', color: '#FFFFFF', glyphRatio: 0.62, strokeRatio: 0.012 },
];

const only = process.argv.slice(2);
const selected = only.length > 0 ? outputs.filter((output) => only.includes(output.file)) : outputs;

/** Renders with the system Chrome when Playwright is not installed. */
function renderWithChrome(output) {
  const dir = mkdtempSync(join(tmpdir(), 'brand-'));
  const html = join(dir, 'page.html');
  writeFileSync(html, page(output));
  execFileSync(CHROME, [
    '--headless',
    '--hide-scrollbars',
    '--force-device-scale-factor=1',
    `--window-size=${output.size},${output.size}`,
    '--default-background-color=00000000',
    '--virtual-time-budget=2000',
    `--screenshot=${join(assets, output.file)}`,
    `file://${html}`,
  ], { stdio: 'ignore' });
  console.log('wrote', output.file);
}

if (!chromium) {
  for (const output of selected) {
    renderWithChrome(output);
  }
  process.exit(0);
}

const browser = await chromium.launch();
for (const output of selected) {
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
