/** @type {import('@bacons/apple-targets/app.plugin').ConfigFunction} */
module.exports = () => ({
  // Spec 0025 Level 2: the workout on the Apple Watch, embedded in the iOS app.
  type: 'watch',
  name: 'TrainingHubWatch',
  displayName: 'TrainingHub',
  bundleIdentifier: '.watchkitapp',
  // The owner's Apple Watch Ultra 2 runs watchOS 11 or later (spec assumption).
  deploymentTarget: '11.0',
  frameworks: ['SwiftUI', 'HealthKit', 'WatchConnectivity', 'WatchKit'],
  entitlements: {
    'com.apple.developer.healthkit': true,
  },
});
