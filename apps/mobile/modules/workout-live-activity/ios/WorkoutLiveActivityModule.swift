import ActivityKit
import ExpoModulesCore

struct StartActivityPayload: Record {
  @Field var workoutId: String = ""
  @Field var startedAtMs: Double = 0
  @Field var routineName: String = ""
  @Field var pausedAtMs: Double? = nil
  @Field var pausedSeconds: Double = 0
  @Field var activeKcal: Int? = nil
  @Field var restEndsAtMs: Double? = nil
  @Field var upNext: String? = nil
  @Field var setsDone: Int? = nil
  @Field var setsTotal: Int? = nil
  @Field var setsLabel: String? = nil
  @Field var pausedLabel: String = ""
  @Field var pauseLabel: String = ""
  @Field var resumeLabel: String = ""
  @Field var finishLabel: String = ""
  @Field var discardLabel: String? = nil
  @Field var nextLabel: String? = nil
  @Field var allDoneLabel: String? = nil
}

public class WorkoutLiveActivityModule: Module {
  private var observer: NSObjectProtocol?

  public func definition() -> ModuleDefinition {
    Name("WorkoutLiveActivity")

    Events("onStateChange")

    OnCreate {
      // Posted by the Pause/Resume intents after they update the activity.
      self.observer = NotificationCenter.default.addObserver(
        forName: Notification.Name("WorkoutActivityDidChange"),
        object: nil,
        queue: .main
      ) { [weak self] note in
        self?.sendEvent("onStateChange", (note.userInfo as? [String: Any]) ?? [:])
      }
    }

    OnDestroy {
      if let observer = self.observer {
        NotificationCenter.default.removeObserver(observer)
      }
    }

    Function("isSupported") { () -> Bool in
      if #available(iOS 16.2, *) {
        return ActivityAuthorizationInfo().areActivitiesEnabled
      }
      return false
    }

    AsyncFunction("start") { (payload: StartActivityPayload) async throws in
      guard #available(iOS 16.2, *) else { return }
      await ActivityStore.endAll()
      try ActivityStore.start(payload)
    }

    AsyncFunction("setPause") { (workoutId: String, pausedAtMs: Double?, pausedSeconds: Double) async in
      guard #available(iOS 16.2, *) else { return }
      await ActivityStore.update(workoutId: workoutId) { state in
        state.pausedAt = pausedAtMs.map { Date(timeIntervalSince1970: $0 / 1000) }
        state.pausedSeconds = pausedSeconds
      }
    }

    AsyncFunction("setKcal") { (workoutId: String, kcal: Int?) async in
      guard #available(iOS 16.2, *) else { return }
      await ActivityStore.update(workoutId: workoutId) { state in
        state.activeKcal = kcal
      }
    }

    AsyncFunction("setRest") { (workoutId: String, restEndsAtMs: Double?) async in
      guard #available(iOS 16.2, *) else { return }
      await ActivityStore.update(workoutId: workoutId) { state in
        state.restEndsAt = restEndsAtMs.map { Date(timeIntervalSince1970: $0 / 1000) }
      }
    }

    AsyncFunction("setProgress") { (
      workoutId: String,
      upNext: String?,
      setsDone: Int,
      setsTotal: Int,
      setsLabel: String
    ) async in
      guard #available(iOS 16.2, *) else { return }
      await ActivityStore.update(workoutId: workoutId) { state in
        state.upNext = upNext
        state.setsDone = setsDone
        state.setsTotal = setsTotal
        state.setsLabel = setsLabel
      }
    }

    AsyncFunction("end") { () async in
      guard #available(iOS 16.2, *) else { return }
      await ActivityStore.endAll()
    }

    AsyncFunction("getState") { () -> [String: Any]? in
      guard #available(iOS 16.2, *) else { return nil }
      return ActivityStore.currentState()
    }
  }
}

@available(iOS 16.2, *)
private enum ActivityStore {
  static func start(_ payload: StartActivityPayload) throws {
    let attributes = WorkoutActivityAttributes(
      workoutId: payload.workoutId,
      startedAt: Date(timeIntervalSince1970: payload.startedAtMs / 1000),
      routineName: payload.routineName,
      pausedLabel: payload.pausedLabel,
      pauseLabel: payload.pauseLabel,
      resumeLabel: payload.resumeLabel,
      finishLabel: payload.finishLabel,
      discardLabel: payload.discardLabel,
      nextLabel: payload.nextLabel,
      allDoneLabel: payload.allDoneLabel
    )
    let state = WorkoutActivityAttributes.ContentState(
      pausedAt: payload.pausedAtMs.map { Date(timeIntervalSince1970: $0 / 1000) },
      pausedSeconds: payload.pausedSeconds,
      activeKcal: payload.activeKcal,
      restEndsAt: payload.restEndsAtMs.map { Date(timeIntervalSince1970: $0 / 1000) },
      upNext: payload.upNext,
      setsDone: payload.setsDone,
      setsTotal: payload.setsTotal,
      setsLabel: payload.setsLabel
    )
    // pushType nil: a free developer team has no push entitlement.
    _ = try Activity.request(
      attributes: attributes,
      content: ActivityContent(state: state, staleDate: state.staleDate),
      pushType: nil
    )
  }

  static func update(
    workoutId: String,
    _ change: (inout WorkoutActivityAttributes.ContentState) -> Void
  ) async {
    for activity in Activity<WorkoutActivityAttributes>.activities
    where activity.attributes.workoutId == workoutId {
      var state = activity.content.state
      change(&state)
      await activity.update(ActivityContent(state: state, staleDate: state.staleDate))
    }
  }

  static func endAll() async {
    for activity in Activity<WorkoutActivityAttributes>.activities {
      await activity.end(nil, dismissalPolicy: .immediate)
    }
  }

  static func currentState() -> [String: Any]? {
    guard let activity = Activity<WorkoutActivityAttributes>.activities.first else {
      return nil
    }
    let state = activity.content.state
    return [
      "workoutId": activity.attributes.workoutId,
      "startedAtMs": activity.attributes.startedAt.timeIntervalSince1970 * 1000,
      "pausedAtMs": state.pausedAt.map { $0.timeIntervalSince1970 * 1000 } as Any,
      "pausedSeconds": state.pausedSeconds,
      "activeKcal": state.activeKcal as Any,
    ]
  }
}
