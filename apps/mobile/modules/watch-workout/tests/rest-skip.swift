import Foundation
@main
struct RestSkipChecks {
  static func main() throws {
    var state = WatchRestSkipState()
    state.skip(workoutId: "workout", restId: "done-1", requestId: "skip-1", atMs: 100)
    precondition(state.suppresses("done-1"))
    precondition(!state.suppresses("done-2"))
    state.reconcile(workoutId: "workout", acknowledgement: "unrelated")
    precondition(state.pending?.requestId == "skip-1", "Unrelated context is not an acknowledgement")
    state = try JSONDecoder().decode(WatchRestSkipState.self, from: JSONEncoder().encode(state))
    precondition(state.pending?.restId == "done-1", "Restart preserves targeted pending skip")
    state.reconcile(workoutId: "workout", acknowledgement: "skip-1")
    precondition(state.pending == nil)
    precondition(state.suppresses("done-1"), "Even an acknowledged rest must never be resurrected")
    state.skip(workoutId: "workout", restId: "done-2", requestId: "skip-2", atMs: 200)
    state.reconcile(workoutId: "workout", acknowledgement: "skip-1")
    precondition(state.pending?.requestId == "skip-2", "Old acknowledgement cannot clear newer skip")
    state.reconcile(workoutId: "replacement", acknowledgement: nil)
    precondition(state.pending == nil && !state.suppresses("done-1"))
    precondition(state.acceptContext(workoutId: "replacement", sentAtMs: 300, acknowledgement: nil, restId: nil))
    state.skip(workoutId: "replacement", restId: "r3", requestId: "s3", atMs: 301)
    state = try JSONDecoder().decode(WatchRestSkipState.self, from: JSONEncoder().encode(state))
    precondition(!state.acceptContext(workoutId: "old-workout", sentAtMs: 299, acknowledgement: nil, restId: "old"))
    precondition(state.pending?.requestId == "s3", "Old context after restart must not lose pending skip")
    state.reconcile(workoutId: "replacement", acknowledgement: "s3", restId: "r3")
    precondition(!state.suppresses("r3"), "A rejected skip must restore the authoritative phone rest")
    state.endWorkout()
    precondition(!state.acceptContext(workoutId: "old-workout", sentAtMs: 299, acknowledgement: nil, restId: nil))
    print("Rest skip checks passed")
  }
}
