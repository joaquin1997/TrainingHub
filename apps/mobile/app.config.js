// Extends app.json (still the source of truth for everything else).
//
// Spec 0025 Level 2: the Apple Watch app (`targets/watch/`) is generated only
// when TRAININGHUB_WATCH_APP=1 is set at `expo prebuild`. Building it needs
// the watchOS platform installed in Xcode and a second signed bundle id on the
// free team; until the owner has done that once, a prebuild without the flag
// keeps the iPhone build exactly as before (Live Activity included).
const withWatchApp = process.env.TRAININGHUB_WATCH_APP === '1';

module.exports = ({ config }) => ({
  ...config,
  plugins: config.plugins.map((plugin) =>
    plugin === '@bacons/apple-targets' && !withWatchApp
      ? ['@bacons/apple-targets', { match: 'workout-activity' }]
      : plugin,
  ),
});
