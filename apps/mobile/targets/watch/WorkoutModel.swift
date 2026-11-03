import Foundation
import HealthKit
import WatchConnectivity
import WatchKit

/// The workout on the watch (spec 0025 Level 2). The phone is the source of
/// the logged data: it sends what to show (`WatchContext`), the watch sends
/// requests back (`WatchEvent`, queued in order — EF-1) and the calories it
/// measures (`WatchMetrics`, FR-3). The watch runs the HealthKit workout
/// session that measures heart rate and active energy and, when the phone
/// finishes the workout, saves it to Health — the only workout written (FR-5).
@MainActor
final class WorkoutModel: NSObject, ObservableObject {
  static let shared = WorkoutModel()

  /// What the phone sent last; nil before anything arrived.
  @Published private(set) var context: WatchContext?
  /// Beats per minute; nil when unknown or not permitted — never shown as 0 (EF-2).
  @Published private(set) var heartRate: Double?
  /// Active energy measured since the start, in kcal; nil until measured.
  @Published private(set) var activeKcal: Double?
  /// A rest started here by Done, until the phone's next context replaces it.
  @Published private(set) var localRestEndsAt: Date?
  /// The set ticked here, hidden until the phone sends the next one.
  @Published private(set) var tickedSetId: String?
  /// Finish was asked here; the phone confirms.
  @Published private(set) var finishAsked = false
  /// Discard could not reach the phone: it is never queued (spec 0035 EF-8).
  @Published var discardUnreachable = false
  /// A set was ticked here and the phone has not sent the next one in time
  /// (spec 0045 FR-4): shown in place of the set.
  @Published private(set) var waitingForPhone = false

  private let healthStore = HKHealthStore()
  private var session: HKWorkoutSession?
  private var builder: HKLiveWorkoutBuilder?
  /// The workout the running session belongs to.
  private var sessionWorkoutId: String?
  /// Workouts already ended here; a late context must not restart them.
  private var endedWorkoutIds: Set<String> = []
  private var restTimer: Timer?
  private var buzzedRestEnd: Date?
  private var lastMetricsSentAt: Date?
  private var lastMetricsKcal: Int?
  /// The context JSON applied last: the same context can arrive twice, over
  /// the mirrored session and as application context (spec 0045).
  private var lastContextJSON: String?
  private var waitingTimer: Timer?
  /// How long after a tick the watch says it is waiting (spec 0045 FR-4).
  private static let waitingAfter: TimeInterval = 5

  var labels: WatchContext.Labels { context?.labels ?? .fallback }

  var activeWorkout: WatchContext? {
    guard let context, context.status == .active else { return nil }
    return context
  }

  var isPaused: Bool { activeWorkout?.pausedAtMs != nil }

  /// The rest to count down: the local one until the phone confirms it.
  var restEndsAt: Date? {
    let fromPhone = activeWorkout?.restEndsAtMs.map(Date.init(epochMs:))
    let end = localRestEndsAt ?? fromPhone
    guard let end, end > Date() else { return nil }
    return end
  }

  var currentSet: WatchContext.CurrentSet? {
    guard let set = activeWorkout?.currentSet, set.setId != tickedSetId else { return nil }
    return set
  }

  // MARK: Start-up

  func activate() {
    guard WCSession.isSupported() else { return }
    WCSession.default.delegate = self
    WCSession.default.activate()
  }

  /// The phone launched the app to start a workout (FR-2). The session starts
  /// as soon as the phone's context is here, from the phone's start instant.
  func workoutLaunchRequested() {
    Task { await ensureSession() }
  }

  // MARK: Phone → watch

  private func apply(contextJSON json: String) {
    // A copy arriving late must not undo a tick made since (spec 0045).
    guard json != lastContextJSON, let next = WatchWire.decodeContext(json) else { return }
    // Application context is latest-wins, but keep the newest if two cross.
    let previous = context
    if let previous, previous.workoutId == next.workoutId, previous.sentAtMs > next.sentAtMs {
      return
    }
    context = next
    lastContextJSON = json
    localRestEndsAt = nil
    tickedSetId = nil
    stopWaiting()
    if next.status != .active || next.workoutId != previous?.workoutId {
      finishAsked = false
    }
    scheduleRestHaptic()

    switch next.status {
    case .active:
      Task { await ensureSession() }
      syncPause(paused: next.pausedAtMs != nil)
    case .finished:
      Task { await endSession(workoutId: next.workoutId, save: true) }
    case .discarded:
      Task { await endSession(workoutId: next.workoutId, save: false) }
    }
  }

  // MARK: Requests from the wrist

  /// Ticks the set to do; `reps` are the ones chosen here (spec 0041), nil
  /// for a set without a reps control.
  func tickCurrentSet(reps: Int? = nil) {
    guard let workout = activeWorkout, let set = currentSet else { return }
    let now = Date()
    send(WatchEvent(
      id: UUID().uuidString,
      kind: .setDone,
      workoutId: workout.workoutId,
      exerciseId: set.exerciseId,
      setId: set.setId,
      atMs: now.epochMs,
      reps: set.reps != nil ? reps : nil
    ))
    tickedSetId = set.setId
    // The rest starts here at once; the phone counts it from the same instant.
    localRestEndsAt = set.restSeconds > 0 ? now.addingTimeInterval(set.restSeconds) : nil
    scheduleRestHaptic()
    startWaiting(for: set.setId)
  }

  func togglePause() {
    guard let workout = activeWorkout else { return }
    let pausing = !isPaused
    send(WatchEvent(
      id: UUID().uuidString,
      kind: pausing ? .pause : .resume,
      workoutId: workout.workoutId,
      atMs: Date().epochMs
    ))
    // The session follows at once; the phone's next context confirms it.
    syncPause(paused: pausing)
  }

  func requestFinish() {
    guard let workout = activeWorkout else { return }
    send(WatchEvent(id: UUID().uuidString, kind: .finishRequested, workoutId: workout.workoutId))
    finishAsked = true
  }

  /// Whether the phone can take a discard right now (spec 0035 EF-8).
  var canReachPhone: Bool { WCSession.default.isReachable }

  /// Discard, already confirmed here (FR-22). Sent as a live message, never
  /// queued: a discard arriving late, after training went on on the phone,
  /// would destroy work the person did not mean to lose (EF-8).
  func requestDiscard() {
    guard let workout = activeWorkout else { return }
    guard WCSession.default.isReachable,
          let json = WatchWire.encode(WatchEvent(
            id: UUID().uuidString,
            kind: .discardRequested,
            workoutId: workout.workoutId
          ))
    else {
      discardUnreachable = true
      return
    }
    WCSession.default.sendMessage(["event": json], replyHandler: nil) { [weak self] _ in
      Task { @MainActor in self?.discardUnreachable = true }
    }
  }

  private func send(_ event: WatchEvent) {
    guard let json = WatchWire.encode(event) else { return }
    // At once over the mirrored workout session, which keeps the iPhone app
    // running with the phone locked (spec 0045); fails quietly when it is not
    // mirrored. The phone drops the second copy by the event's id.
    if let session, let data = try? JSONSerialization.data(withJSONObject: ["event": json]) {
      Task { try? await session.sendToRemoteWorkoutSession(data: data) }
    }
    // Queued by the system and delivered in order, also after lost contact (EF-1).
    WCSession.default.transferUserInfo(["event": json])
  }

  // MARK: Waiting for the phone (spec 0045 FR-4)

  private func startWaiting(for setId: String) {
    stopWaiting()
    let timer = Timer(timeInterval: Self.waitingAfter, repeats: false) { [weak self] _ in
      Task { @MainActor in
        guard let self, self.tickedSetId == setId else { return }
        self.waitingForPhone = true
      }
    }
    RunLoop.main.add(timer, forMode: .common)
    waitingTimer = timer
  }

  private func stopWaiting() {
    waitingTimer?.invalidate()
    waitingTimer = nil
    waitingForPhone = false
  }

  // MARK: Rest

  private func scheduleRestHaptic() {
    restTimer?.invalidate()
    restTimer = nil
    guard let end = restEndsAt, end != buzzedRestEnd else { return }
    let timer = Timer(fire: end, interval: 0, repeats: false) { [weak self] _ in
      Task { @MainActor in self?.restEnded(at: end) }
    }
    RunLoop.main.add(timer, forMode: .common)
    restTimer = timer
  }

  private func restEnded(at end: Date) {
    guard buzzedRestEnd != end else { return }
    buzzedRestEnd = end
    // TODO(sdd): with the phone locked, spec 0018's rest notification is also
    // forwarded to the watch — check on the device whether it buzzes twice.
    WKInterfaceDevice.current().play(.stop)
    objectWillChange.send()
  }

  // MARK: HealthKit session

  private func ensureSession() async {
    // `sessionWorkoutId` is set before the first await, so a second call while
    // this one waits for authorization starts nothing.
    guard sessionWorkoutId == nil,
          let workout = activeWorkout,
          !endedWorkoutIds.contains(workout.workoutId),
          HKHealthStore.isHealthDataAvailable()
    else { return }

    sessionWorkoutId = workout.workoutId
    await requestAuthorization()

    let configuration = HKWorkoutConfiguration()
    configuration.activityType = .traditionalStrengthTraining
    configuration.locationType = .indoor
    // From the phone's start, so the workout in Health spans the app's.
    let start = workout.startedAtMs.map(Date.init(epochMs:)) ?? Date()

    do {
      let session = try HKWorkoutSession(healthStore: healthStore, configuration: configuration)
      let builder = session.associatedWorkoutBuilder()
      builder.dataSource = HKLiveWorkoutDataSource(
        healthStore: healthStore,
        workoutConfiguration: configuration
      )
      session.delegate = self
      builder.delegate = self
      self.session = session
      self.builder = builder
      session.startActivity(with: start)
      try await builder.beginCollection(at: start)
      // The iPhone app runs in the background while the session is mirrored,
      // so a tick here is applied with the phone locked (spec 0045). Without
      // it everything works as before, over the queue.
      Task { try? await session.startMirroringToCompanionDevice() }
      // The phone may have ended the workout while the session was starting.
      if let ended = context, ended.workoutId == workout.workoutId, ended.status != .active {
        await endSession(workoutId: workout.workoutId, save: ended.status == .finished)
        return
      }
      syncPause(paused: isPaused)
    } catch {
      self.session = nil
      self.builder = nil
      sessionWorkoutId = nil
    }
  }

  private func requestAuthorization() async {
    let share: Set<HKSampleType> = [
      HKObjectType.workoutType(),
      HKQuantityType(.activeEnergyBurned),
    ]
    let read: Set<HKObjectType> = [
      HKQuantityType(.heartRate),
      HKQuantityType(.activeEnergyBurned),
    ]
    // A refusal is not an error here: the rest still works, metrics stay hidden.
    try? await healthStore.requestAuthorization(toShare: share, read: read)
  }

  private func syncPause(paused: Bool) {
    guard let session else { return }
    if paused, session.state == .running {
      session.pause()
    } else if !paused, session.state == .paused {
      session.resume()
    }
  }

  private func endSession(workoutId: String, save: Bool) async {
    endedWorkoutIds.insert(workoutId)
    restTimer?.invalidate()
    stopWaiting()
    // A session still starting is ended by `ensureSession` once it is up.
    guard let session, let builder, sessionWorkoutId == workoutId else { return }
    self.session = nil
    self.builder = nil
    sessionWorkoutId = nil

    session.end()
    if save {
      do {
        try await builder.endCollection(at: Date())
        _ = try await builder.finishWorkout()
      } catch {
        builder.discardWorkout()
      }
    } else {
      builder.discardWorkout()
    }
    heartRate = nil
    activeKcal = nil
    lastMetricsKcal = nil
  }

  // MARK: Metrics

  private func collected(_ statistics: [HKQuantityType: HKStatistics]) {
    if let heart = statistics[HKQuantityType(.heartRate)]?.mostRecentQuantity() {
      heartRate = heart.doubleValue(for: .count().unitDivided(by: .minute()))
    }
    if let energy = statistics[HKQuantityType(.activeEnergyBurned)]?.sumQuantity() {
      activeKcal = energy.doubleValue(for: .kilocalorie())
      sendMetrics()
    }
  }

  /// The phone shows the watch's figure (FR-3); at most every 10 s.
  private func sendMetrics() {
    guard let workoutId = sessionWorkoutId, let kcal = activeKcal else { return }
    let rounded = Int(kcal.rounded())
    if rounded == lastMetricsKcal { return }
    if let last = lastMetricsSentAt, Date().timeIntervalSince(last) < 10 { return }
    guard let json = WatchWire.encode(WatchMetrics(workoutId: workoutId, kcal: kcal)) else { return }
    lastMetricsSentAt = Date()
    lastMetricsKcal = rounded
    try? WCSession.default.updateApplicationContext(["metrics": json])
  }
}

// MARK: - WCSessionDelegate

extension WorkoutModel: WCSessionDelegate {
  nonisolated func session(
    _ session: WCSession,
    activationDidCompleteWith activationState: WCSessionActivationState,
    error: Error?
  ) {
    let json = session.receivedApplicationContext["context"] as? String
    Task { @MainActor in
      if let json { self.apply(contextJSON: json) }
    }
  }

  nonisolated func session(_ session: WCSession, didReceiveApplicationContext applicationContext: [String: Any]) {
    let json = applicationContext["context"] as? String
    Task { @MainActor in
      if let json { self.apply(contextJSON: json) }
    }
  }
}

// MARK: - HealthKit delegates

extension WorkoutModel: HKWorkoutSessionDelegate, HKLiveWorkoutBuilderDelegate {
  nonisolated func workoutSession(
    _ workoutSession: HKWorkoutSession,
    didChangeTo toState: HKWorkoutSessionState,
    from fromState: HKWorkoutSessionState,
    date: Date
  ) {}

  nonisolated func workoutSession(_ workoutSession: HKWorkoutSession, didFailWithError error: Error) {
    Task { @MainActor in
      // The phone's workout goes on; this watch stops measuring it.
      self.session = nil
      self.builder = nil
      self.sessionWorkoutId = nil
    }
  }

  nonisolated func workoutBuilder(
    _ workoutBuilder: HKLiveWorkoutBuilder,
    didCollectDataOf collectedTypes: Set<HKSampleType>
  ) {
    var statistics: [HKQuantityType: HKStatistics] = [:]
    for type in collectedTypes {
      if let quantityType = type as? HKQuantityType,
         let value = workoutBuilder.statistics(for: quantityType) {
        statistics[quantityType] = value
      }
    }
    Task { @MainActor in self.collected(statistics) }
  }

  nonisolated func workoutBuilderDidCollectEvent(_ workoutBuilder: HKLiveWorkoutBuilder) {}

  /// The phone's context over the mirrored session (spec 0045); the same JSON
  /// as the application context, so a copy from either path is dropped.
  nonisolated func workoutSession(
    _ workoutSession: HKWorkoutSession,
    didReceiveDataFromRemoteWorkoutSession data: [Data]
  ) {
    let contexts = data.compactMap {
      (try? JSONSerialization.jsonObject(with: $0) as? [String: Any])?["context"] as? String
    }
    Task { @MainActor in
      contexts.forEach { self.apply(contextJSON: $0) }
    }
  }
}
