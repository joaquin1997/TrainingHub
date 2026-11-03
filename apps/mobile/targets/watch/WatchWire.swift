import Foundation

// The JSON exchanged with the phone (spec 0025). Mirrors
// `src/features/health/providers/appleWatchWire.ts`; a test checks that every
// key the phone uses exists here. Instants are epoch milliseconds.

/// Phone → watch: application context `["context": json]`, latest wins.
struct WatchContext: Codable, Equatable {
  struct CurrentSet: Codable, Equatable {
    let exerciseId: String
    let setId: String
    let exerciseName: String
    let setTitle: String
    let target: String
    let restSeconds: Double
    /// Spec 0041: where the reps control starts, for a set that records reps
    /// on one side, and the planned values beside it. Absent otherwise or
    /// from an older phone build.
    var reps: Int? = nil
    var load: String? = nil
  }

  struct Labels: Codable, Equatable {
    let done: String
    let pause: String
    let resume: String
    let finish: String
    let rest: String
    let paused: String
    let finishOnPhone: String
    let allDone: String
    let waiting: String
    // Spec 0035; optional so a context from an older phone build decodes.
    var more: String? = nil
    var discard: String? = nil
    var discardTitle: String? = nil
    var cancel: String? = nil
    var connectToDiscard: String? = nil
    /// Spec 0041: the unit under the reps control.
    var reps: String? = nil
    /// Spec 0045: in place of the set while the next one has not arrived.
    var waitingPhone: String? = nil

    static let fallback = Labels(
      done: "Done",
      pause: "Pause",
      resume: "Resume",
      finish: "Finish",
      rest: "Rest",
      paused: "Paused",
      finishOnPhone: "Confirm on your iPhone",
      allDone: "All sets done",
      waiting: "Start a workout on your iPhone",
      more: "More",
      discard: "Discard",
      discardTitle: "Discard this workout?",
      cancel: "Cancel",
      connectToDiscard: "Connect to your iPhone to discard",
      reps: "reps",
      waitingPhone: "Waiting for your iPhone…"
    )
  }

  enum Status: String, Codable {
    case active
    case finished
    case discarded
  }

  let v: Int
  let status: Status
  let workoutId: String
  let sentAtMs: Double
  let routineName: String?
  let startedAtMs: Double?
  let pausedAtMs: Double?
  let pausedSeconds: Double?
  let restEndsAtMs: Double?
  let currentSet: CurrentSet?
  /// Sets done, and the discard confirmation's message naming them (spec 0035).
  let setsDone: Int?
  let discardMessage: String?
  let labels: Labels?
}

/// Watch → phone: user info `["event": json]`, queued and delivered in order.
struct WatchEvent: Codable {
  enum Kind: String, Codable {
    case setDone
    case pause
    case resume
    case finishRequested
    case discardRequested
  }

  var v = 1
  let id: String
  let kind: Kind
  let workoutId: String
  var exerciseId: String? = nil
  var setId: String? = nil
  var atMs: Double? = nil
  /// Spec 0041: the reps chosen here; the phone stores them before ticking.
  var reps: Int? = nil
}

/// Watch → phone: the watch's application context `["metrics": json]`.
struct WatchMetrics: Codable {
  var v = 1
  let workoutId: String
  let kcal: Double
}

extension Date {
  init(epochMs: Double) {
    self.init(timeIntervalSince1970: epochMs / 1000)
  }

  var epochMs: Double { timeIntervalSince1970 * 1000 }
}

enum WatchWire {
  static func decodeContext(_ json: String) -> WatchContext? {
    guard let data = json.data(using: .utf8) else { return nil }
    return try? JSONDecoder().decode(WatchContext.self, from: data)
  }

  static func encode<T: Encodable>(_ value: T) -> String? {
    guard let data = try? JSONEncoder().encode(value) else { return nil }
    return String(data: data, encoding: .utf8)
  }
}
