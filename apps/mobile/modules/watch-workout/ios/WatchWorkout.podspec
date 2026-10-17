Pod::Spec.new do |s|
  s.name           = 'WatchWorkout'
  s.version        = '0.1.0'
  s.summary        = 'Runs the active workout on the paired Apple Watch.'
  s.description    = 'Local Expo module: WatchConnectivity link and HealthKit watch-app launch (spec 0025).'
  s.license        = 'UNLICENSED'
  s.author         = 'TrainingHub'
  s.homepage       = 'https://github.com/'
  s.platforms      = { :ios => '15.1' }
  s.swift_version  = '5.9'
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'
  s.frameworks = 'WatchConnectivity', 'HealthKit'

  s.source_files = '**/*.{h,m,swift}'
  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }
end
