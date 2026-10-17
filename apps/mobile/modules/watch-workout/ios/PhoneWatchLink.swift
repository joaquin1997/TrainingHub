import Foundation
import HealthKit
import WatchConnectivity

/// The phone's side of the link to the watch app (spec 0025). The JSON inside
/// the messages is built and read in JS (`appleWatchWire.ts`) and by the watch
/// app; this class only carries it.
///
/// - Phone → watch: the application context `["context": json]` (latest wins).
/// - Watch → phone: user info `["event": json]` (queued, in order) and the
///   watch's application context `["metrics": json]` (latest wins).
final class PhoneWatchLink: NSObject, WCSessionDelegate {
  static let shared = PhoneWatchLink()

  /// Receives `(kind, json)` on the main queue; kind is "event" or "metrics".
  var onMessage: ((String, String) -> Void)?

  private let healthStore = HKHealthStore()
  private var activated = false
  /// Work waiting for the session to activate, run in order once it does.
  private var pending: [() -> Void] = []

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

  func session(_ session: WCSession, didReceiveApplicationContext applicationContext: [String: Any]) {
    deliver("metrics", applicationContext["metrics"])
  }
}
