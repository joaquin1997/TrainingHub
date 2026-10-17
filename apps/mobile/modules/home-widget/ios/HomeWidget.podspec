Pod::Spec.new do |s|
  s.name           = 'HomeWidget'
  s.version        = '0.1.0'
  s.summary        = 'Hands the home-screen widget its figures.'
  s.description    = 'Local Expo module: writes the widget snapshot to the App Group and reloads the widgets (spec 0036).'
  s.license        = 'UNLICENSED'
  s.author         = 'TrainingHub'
  s.homepage       = 'https://github.com/'
  s.platforms      = { :ios => '15.1' }
  s.swift_version  = '5.9'
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'
  s.frameworks = 'WidgetKit'

  s.source_files = '**/*.{h,m,swift}'
  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }
end
