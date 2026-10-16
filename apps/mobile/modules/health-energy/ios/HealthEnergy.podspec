Pod::Spec.new do |s|
  s.name           = 'HealthEnergy'
  s.version        = '0.1.0'
  s.summary        = 'Reads active energy burned from HealthKit.'
  s.description    = 'Local Expo module: sums HealthKit active energy over a time range.'
  s.license        = 'UNLICENSED'
  s.author         = 'TrainingHub'
  s.homepage       = 'https://github.com/'
  s.platforms      = { :ios => '15.1' }
  s.swift_version  = '5.9'
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'
  s.frameworks = 'HealthKit'

  s.source_files = '**/*.{h,m,swift}'
  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }
end
