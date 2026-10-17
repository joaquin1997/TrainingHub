Pod::Spec.new do |s|
  s.name           = 'RestAlert'
  s.version        = '0.1.0'
  s.summary        = 'Schedules the local alert at the end of a rest.'
  s.description    = 'Local Expo module: one local notification for the rest timer (spec 0018).'
  s.license        = 'UNLICENSED'
  s.author         = 'TrainingHub'
  s.homepage       = 'https://github.com/'
  s.platforms      = { :ios => '15.1' }
  s.swift_version  = '5.9'
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'
  s.frameworks = 'UserNotifications'

  s.source_files = '**/*.{h,m,swift}'
  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }
end
