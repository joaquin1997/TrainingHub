/** @type {import('@bacons/apple-targets/app.plugin').ConfigFunction} */
module.exports = () => ({
  type: 'widget',
  name: 'WorkoutActivity',
  displayName: 'TrainingHub',
  bundleIdentifier: '.workoutactivity',
  // Interactive buttons in a Live Activity (App Intents) need iOS 17.
  deploymentTarget: '17.0',
  frameworks: ['SwiftUI', 'WidgetKit', 'ActivityKit', 'AppIntents'],
});
