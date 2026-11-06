import Foundation

/// Retries a failed initial mirror without creating another Health workout.
/// HealthKit itself reconnects an established mirror after a disconnection.
@MainActor
final class WorkoutMirroringRecovery {
  private var task: Task<Void, Never>?
  private var generation = 0
  private var connected = false
  private let sleep: (UInt64) async throws -> Void

  init(sleep: @escaping (UInt64) async throws -> Void = { try await Task.sleep(nanoseconds: $0) }) {
    self.sleep = sleep
  }

  func start(connect: @escaping () async throws -> Void) {
    guard task == nil, !connected else { return }
    let version = generation
    task = Task { [weak self] in
      var delay: UInt64 = 1
      while !Task.isCancelled {
        do {
          try await connect()
          guard let self, self.generation == version, !Task.isCancelled else { return }
          self.connected = true
          self.task = nil
          return
        } catch {
          guard let self, self.generation == version, !Task.isCancelled else { return }
          do {
            try await self.sleep(delay * 1_000_000_000)
          } catch { return }
          delay = min(delay * 2, 30)
        }
      }
    }
  }

  func stop() {
    generation += 1
    task?.cancel()
    task = nil
    connected = false
  }
}
