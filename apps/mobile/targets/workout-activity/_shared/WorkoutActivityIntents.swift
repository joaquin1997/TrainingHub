import ActivityKit
import AppIntents
import Foundation

// LiveActivityIntent runs in the app's process, so it can update the activity
// even while the app is suspended. It also posts a notification that the native
// module forwards to JS when the JS runtime is alive.
@available(iOS 17.0, *)
struct PauseWorkoutIntent: LiveActivityIntent {
  static var title: LocalizedStringResource = "Pause workout"
  // Pausing a timer exposes no data: allow it from the lock screen without Face ID.
  static var authenticationPolicy: IntentAuthenticationPolicy = .alwaysAllowed

  @Parameter(title: "Workout ID")
  var workoutId: String

  init() {}

  init(workoutId: String) {
    self.workoutId = workoutId
  }

  func perform() async throws -> some IntentResult {
    await WorkoutActivityActions.setPaused(true, workoutId: workoutId)
    return .result()
  }
}

@available(iOS 17.0, *)
struct ResumeWorkoutIntent: LiveActivityIntent {
  static var title: LocalizedStringResource = "Resume workout"
  // Pausing a timer exposes no data: allow it from the lock screen without Face ID.
  static var authenticationPolicy: IntentAuthenticationPolicy = .alwaysAllowed

  @Parameter(title: "Workout ID")
  var workoutId: String

  init() {}

  init(workoutId: String) {
    self.workoutId = workoutId
  }

  func perform() async throws -> some IntentResult {
    await WorkoutActivityActions.setPaused(false, workoutId: workoutId)
    return .result()
  }
}

@available(iOS 17.0, *)
enum WorkoutActivityActions {
  /// Must match the name the native module observes.
  static let didChangeNotification = Notification.Name("WorkoutActivityDidChange")

  static func setPaused(_ paused: Bool, workoutId: String) async {
    let now = Date()
    for activity in Activity<WorkoutActivityAttributes>.activities
    where activity.attributes.workoutId == workoutId {
      var state = activity.content.state
      if paused {
        guard state.pausedAt == nil else { continue }
        state.pausedAt = now
      } else {
        guard let pausedAt = state.pausedAt else { continue }
        state.pausedSeconds += now.timeIntervalSince(pausedAt)
        state.pausedAt = nil
      }
      await activity.update(ActivityContent(state: state, staleDate: nil))
    }
    NotificationCenter.default.post(
      name: didChangeNotification,
      object: nil,
      userInfo: [
        "workoutId": workoutId,
        "paused": paused,
        "atMs": now.timeIntervalSince1970 * 1000,
      ]
    )
  }
}
