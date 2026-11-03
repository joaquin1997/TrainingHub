import ExpoModulesCore

/// Installs the phone's handler for the watch's mirrored workout session at
/// launch, before React Native loads: the system may launch the app in the
/// background just to hand it the session (spec 0045).
public class WatchWorkoutAppDelegate: ExpoAppDelegateSubscriber {
  public func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    PhoneWatchLink.shared.installMirroringHandler()
    return true
  }
}
