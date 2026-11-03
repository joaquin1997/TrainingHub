import Foundation
import HealthKit
import WatchConnectivity

/// The phone's side of the link to the watch app (spec 0025). The JSON inside
/// the messages is built and read in JS (`appleWatchWire.ts`) and by the watch
/// app; this class only carries it.
///
/// - Phone → watch: the application context `["context": json]` (latest wins).
/// - Watch → phone: user info `["event": json]` (queued, in order), a live
///   message `["event": json]` for a discard (never queued, spec 0035), and
///   the watch's application context `["metrics": json]` (latest wins).
/// - Spec 0045: while the watch mirrors its workout session here, the system
///   keeps this app running in the background, and the same `context` /
///   `event` dictionaries also travel over that session, at once. The queued
///   copies stay as the fallback; repeats are dropped by the readers.
final class PhoneWatchLink: NSObject, WCSessionDelegate {
  static let shared = PhoneWatchLink()

  /// Receives `(kind, json)` on the main queue; kind is "event" or "metrics".
  var onMessage: ((String, String) -> Void)?

  private let healthStore = HKHealthStore()
  private var activated = false
  /// Work waiting for the session to activate, run in order once it does.
  private var pending: [() -> Void] = []
  /// The watch's mirrored workout session (an `HKWorkoutSession`, iOS 17+),
  /// while it runs. Main queue only.
  private var mirrored: AnyObject?

  /// Takes the watch's mirrored workout session (spec 0045). Called at
  /// launch, from the app delegate.
  func installMirroringHandler() {
    guard #available(iOS 17.0, *), HKHealthStore.isHealthDataAvailable() else { return }
    healthStore.workoutSessionMirroringStartHandler = { [weak self] session in
      guard let self else { return }
      session.delegate = self
      DispatchQueue.main.async { self.mirrored = session }
    }
  }

  @available(iOS 17.0, *)
  private func release(_ session: HKWorkoutSession) {
    DispatchQueue.main.async {
      if self.mirrored === session { self.mirrored = nil }
    }
  }

  func activate() {
    guard WCSession.isSupported() else { return }
    let session = WCSession.default
    session.delegate = self
    session.activate()
  }

  var isWatchAppInstalled: Bool {
    guard activated, WCSession.isSupported() else { return false }
    return WCSession.default.isPaired && WCSession.default.isWatchAppInstalled
  }

  /// Launches the watch app into a strength workout; the watch starts its own
  /// workout session in `handle(_ workoutConfiguration:)`.
  func startWatchApp(completion: @escaping (Bool) -> Void) {
    whenActive { [weak self] in
      guard let self, self.isWatchAppInstalled, HKHealthStore.isHealthDataAvailable() else {
        completion(false)
        return
      }
      let configuration = HKWorkoutConfiguration()
      configuration.activityType = .traditionalStrengthTraining
      configuration.locationType = .indoor
      self.healthStore.startWatchApp(with: configuration) { success, _ in
        completion(success)
      }
    }
  }

  func sendContext(_ json: String) {
    whenActive {
      if #available(iOS 17.0, *),
         let session = self.mirrored as? HKWorkoutSession,
         let data = try? JSONSerialization.data(withJSONObject: ["context": json]) {
        // Fails quietly once the watch stopped mirroring; the context below
        // still gets there.
        Task { try? await session.sendToRemoteWorkoutSession(data: data) }
      }
      guard WCSession.default.isPaired, WCSession.default.isWatchAppInstalled else { return }
      // Fails only when the session is not active; the next change resends.
      try? WCSession.default.updateApplicationContext(["context": json])
    }
  }

  private func whenActive(_ work: @escaping () -> Void) {
    DispatchQueue.main.async {
      if self.activated {
        work()
      } else {
        self.pending.append(work)
      }
    }
  }

  private func deliver(_ kind: String, _ json: Any?) {
    guard let json = json as? String else { return }
    DispatchQueue.main.async { self.onMessage?(kind, json) }
  }

  // MARK: WCSessionDelegate

  func session(
    _ session: WCSession,
    activationDidCompleteWith activationState: WCSessionActivationState,
    error: Error?
  ) {
    DispatchQueue.main.async {
      self.activated = activationState == .activated
      guard self.activated else { return }
      let work = self.pending
      self.pending = []
      work.forEach { $0() }
    }
  }

  func sessionDidBecomeInactive(_ session: WCSession) {
    DispatchQueue.main.async { self.activated = false }
  }

  func sessionDidDeactivate(_ session: WCSession) {
    // Switching to another watch: activate again for the new one.
    session.activate()
  }

  func session(_ session: WCSession, didReceiveUserInfo userInfo: [String: Any] = [:]) {
    deliver("event", userInfo["event"])
  }

  /// Live messages: a discard confirmed on the watch, sent only while the
  /// phone is reachable (spec 0035 EF-8).
  func session(_ session: WCSession, didReceiveMessage message: [String: Any]) {
    deliver("event", message["event"])
  }

  func session(_ session: WCSession, didReceiveApplicationContext applicationContext: [String: Any]) {
    deliver("metrics", applicationContext["metrics"])
  }
}

// MARK: - The watch's mirrored workout session (spec 0045)

@available(iOS 17.0, *)
extension PhoneWatchLink: HKWorkoutSessionDelegate {
  func workoutSession(
    _ workoutSession: HKWorkoutSession,
    didChangeTo toState: HKWorkoutSessionState,
    from fromState: HKWorkoutSessionState,
    date: Date
  ) {
    // Finished or discarded on the watch: the app goes back to sleeping like
    // any app (FR-5).
    if toState == .ended || toState == .stopped {
      release(workoutSession)
    }
  }

  func workoutSession(_ workoutSession: HKWorkoutSession, didFailWithError error: Error) {
    release(workoutSession)
  }

  func workoutSession(_ workoutSession: HKWorkoutSession, didDisconnectFromRemoteDeviceWithError error: Error?) {
    release(workoutSession)
  }

  func workoutSession(_ workoutSession: HKWorkoutSession, didReceiveDataFromRemoteWorkoutSession data: [Data]) {
    for item in data {
      let message = try? JSONSerialization.jsonObject(with: item) as? [String: Any]
      deliver("event", message?["event"])
    }
  }
}
