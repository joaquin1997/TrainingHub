import HealthKit
import SwiftUI
import WatchKit

/// Receives the phone's "start the watch app" (FR-2).
final class WatchAppDelegate: NSObject, WKApplicationDelegate {
  func applicationDidFinishLaunching() {
    Task { @MainActor in WorkoutModel.shared.activate() }
  }

  func handle(_ workoutConfiguration: HKWorkoutConfiguration) {
    Task { @MainActor in WorkoutModel.shared.workoutLaunchRequested() }
  }
}

@main
struct TrainingHubWatchApp: App {
  @WKApplicationDelegateAdaptor(WatchAppDelegate.self) private var delegate

  var body: some Scene {
    WindowGroup {
      WorkoutView(model: WorkoutModel.shared)
    }
  }
}
