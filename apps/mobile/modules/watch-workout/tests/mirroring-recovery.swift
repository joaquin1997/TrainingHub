import Foundation

enum Failure: Error { case offline }

@main
struct MirroringRecoveryChecks {
  @MainActor
  static func main() async {
    var attempts = 0
    var delays: [UInt64] = []
    let recovery = WorkoutMirroringRecovery(sleep: { delays.append($0) })
    let connect: () async throws -> Void = {
      attempts += 1
      if attempts <= 7 { throw Failure.offline }
    }
    recovery.start(connect: connect)
    recovery.start(connect: connect)
    for _ in 0..<200 where attempts < 8 { await Task.yield() }
    precondition(attempts == 8, "Failed initial mirror must retry until connected")
    precondition(delays == [1, 2, 4, 8, 16, 30, 30].map { UInt64($0) * 1_000_000_000 }, "Retry delay must be capped")
    recovery.start(connect: connect)
    await Task.yield()
    precondition(attempts == 8, "Connected or in-flight mirror must not be duplicated")
    recovery.stop()
    recovery.start(connect: connect)
    for _ in 0..<200 where attempts < 9 { await Task.yield() }
    precondition(attempts == 9, "A new workout may mirror again")
    recovery.stop()

    var staleReturn: CheckedContinuation<Void, Never>?
    let stale = WorkoutMirroringRecovery()
    stale.start { await withCheckedContinuation { staleReturn = $0 } }
    for _ in 0..<200 where staleReturn == nil { await Task.yield() }
    precondition(staleReturn != nil)
    stale.stop()
    var newAttempts = 0
    stale.start { newAttempts += 1; throw Failure.offline }
    for _ in 0..<200 where newAttempts == 0 { await Task.yield() }
    staleReturn?.resume()
    await Task.yield()
    stale.start { newAttempts += 100 }
    await Task.yield()
    precondition(newAttempts == 1, "Old completion must not unlock or replace the new attempt")
    stale.stop()
    print("Mirroring recovery checks passed")
  }
}
