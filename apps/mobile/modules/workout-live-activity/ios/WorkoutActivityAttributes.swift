import ActivityKit
import Foundation

// Compiled into both the app and the widget extension (`_shared`). The native
// module keeps an identical copy: a pod cannot see types from the app target.
@available(iOS 16.1, *)
struct WorkoutActivityAttributes: ActivityAttributes {
  public struct ContentState: Codable, Hashable {
    /// Set while the workout is paused.
    var pausedAt: Date?
    /// Total of finished pauses, in seconds.
    var pausedSeconds: Double
    /// Active energy read from Health; nil when unknown.
    var activeKcal: Int?
    /// End of the running rest; nil when none runs (spec 0018).
    var restEndsAt: Date?

    /// Every update passes this as the stale date: the rest's end while it is
    /// ahead, so the system re-renders the activity without the countdown once
    /// it passes, even with the app suspended. Nil otherwise.
    var staleDate: Date? {
      guard let restEndsAt, restEndsAt > Date() else { return nil }
      return restEndsAt
    }
  }

  var workoutId: String
  var startedAt: Date
  var routineName: String
  var pausedLabel: String
  var pauseLabel: String
  var resumeLabel: String
  var finishLabel: String
}
