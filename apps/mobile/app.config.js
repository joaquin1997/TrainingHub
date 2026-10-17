// Extends app.json (still the source of truth for everything else).
//
// Spec 0025 Level 2: the Apple Watch app (`targets/watch/`) is generated only
// when TRAININGHUB_WATCH_APP=1 is set at `expo prebuild`. Building it needs
// the watchOS platform installed in Xcode and a second signed bundle id on the
// free team; until the owner has done that once, a prebuild without the flag
// keeps the iPhone build exactly as before (Live Activity included).
const withWatchApp = process.env.TRAININGHUB_WATCH_APP === '1';

// Spec 0036: the home-screen widget reads the app's figures from an App Group
// shared by the app and the widget extension (the plugin copies the app's App
// Groups to the extension). Opt-in with TRAININGHUB_HOME_WIDGET=1 until the
// free team is known to sign it; without it the widget shows "TrainingHub".
const withHomeWidget = process.env.TRAININGHUB_HOME_WIDGET === '1';
const HOME_WIDGET_APP_GROUP = 'group.com.joaquin.traininghub';

module.exports = ({ config }) => ({
  ...config,
  ios: withHomeWidget
    ? {
        ...config.ios,
        entitlements: {
          ...config.ios.entitlements,
          'com.apple.security.application-groups': [HOME_WIDGET_APP_GROUP],
        },
      }
    : config.ios,
  plugins: config.plugins.map((plugin) =>
    plugin === '@bacons/apple-targets' && !withWatchApp
      ? ['@bacons/apple-targets', { match: 'workout-activity' }]
      : plugin,
  ),
});
