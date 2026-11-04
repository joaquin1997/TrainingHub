import Foundation

/// Durable, workout-scoped suppression: unrelated contexts cannot revive a skipped rest.
struct WatchRestSkipState: Codable {
  struct Pending: Codable {
    let requestId: String
    let restId: String
    let atMs: Double
  }
  var latestContextSentAtMs: Double?
  var workoutId: String?
  var pending: Pending?
  private(set) var skippedRestIds: [String] = []

  mutating func reconcile(workoutId: String, acknowledgement: String?, restId: String? = nil) {
    if self.workoutId != workoutId {
      self.workoutId = workoutId
      pending = nil
      skippedRestIds = []
    }
    if let pending, pending.requestId == acknowledgement {
      // Same rest still present at acknowledgement means the phone refused
      // the skip (e.g. it became paused). Its countdown is authoritative.
      if restId == pending.restId { skippedRestIds.removeAll { $0 == restId } }
      self.pending = nil
    }
  }
  mutating func acceptContext(workoutId: String, sentAtMs: Double, acknowledgement: String?, restId: String?) -> Bool {
    guard sentAtMs.isFinite, sentAtMs >= (latestContextSentAtMs ?? -Double.infinity) else { return false }
    latestContextSentAtMs = sentAtMs
    reconcile(workoutId: workoutId, acknowledgement: acknowledgement, restId: restId)
    return true
  }
  mutating func endWorkout() {
    workoutId = nil
    pending = nil
    skippedRestIds = []
  }
  mutating func skip(workoutId: String, restId: String, requestId: String, atMs: Double) {
    reconcile(workoutId: workoutId, acknowledgement: nil)
    pending = Pending(requestId: requestId, restId: restId, atMs: atMs)
    if !skippedRestIds.contains(restId) { skippedRestIds.append(restId) }
    skippedRestIds = Array(skippedRestIds.suffix(200))
  }
  func suppresses(_ restId: String?) -> Bool {
    guard let restId else { return false }
    return skippedRestIds.contains(restId)
  }
}
