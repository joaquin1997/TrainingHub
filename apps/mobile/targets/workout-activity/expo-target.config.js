/** @type {import('@bacons/apple-targets/app.plugin').ConfigFunction} */
module.exports = () => ({
  type: 'widget',
  name: 'WorkoutActivity',
  displayName: 'TrainingHub',
  bundleIdentifier: '.workoutactivity',
  // Interactive buttons in a Live Activity (App Intents) need iOS 17.
  deploymentTarget: '17.0',
  frameworks: ['SwiftUI', 'WidgetKit', 'ActivityKit', 'AppIntents'],
  // The home-screen widget (spec 0036) reads the app's figures from this App
  // Group; opt-in like in app.config.js.
  ...(process.env.TRAININGHUB_HOME_WIDGET === '1'
    ? { entitlements: { 'com.apple.security.application-groups': ['group.com.joaquin.traininghub'] } }
    : {}),
});
