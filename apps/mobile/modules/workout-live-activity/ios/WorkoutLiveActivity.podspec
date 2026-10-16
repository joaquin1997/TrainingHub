Pod::Spec.new do |s|
  s.name           = 'WorkoutLiveActivity'
  s.version        = '0.1.0'
  s.summary        = 'Starts and updates the active-workout Live Activity.'
  s.description    = 'Local Expo module: ActivityKit bridge for the in-progress workout.'
  s.license        = 'UNLICENSED'
  s.author         = 'TrainingHub'
  s.homepage       = 'https://github.com/'
  s.platforms      = { :ios => '15.1' }
  s.swift_version  = '5.9'
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'
  s.weak_frameworks = 'ActivityKit'

  s.source_files = '**/*.{h,m,swift}'
  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }
end
