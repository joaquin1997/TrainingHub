import SwiftUI

private let primary = Color(red: 0xC8 / 255, green: 0xFF / 255, blue: 0x2E / 255)
private let onPrimary = Color(red: 0x10 / 255, green: 0x14 / 255, blue: 0x0D / 255)
private let textMuted = Color(red: 0xA7 / 255, green: 0xB0 / 255, blue: 0xBE / 255)
private let accent = Color(red: 0xFF / 255, green: 0x8A / 255, blue: 0x3D / 255)

/// One screen: clock, heart rate, calories, rest, the set to do and the
/// controls (spec 0025 FR-3, FR-4). The reps of the set to do can be changed
/// before Done (spec 0041); the weight is confirmed as planned.
struct WorkoutView: View {
  @ObservedObject var model: WorkoutModel
  /// The secondary menu (spec 0035 FR-22): Discard is never a main control.
  @State private var showsMenu = false
  @State private var confirmsDiscard = false
  /// The reps shown for the set to do (spec 0041 FR-10).
  @State private var reps = 0

  var body: some View {
    if let workout = model.activeWorkout {
      ScrollView {
        VStack(alignment: .leading, spacing: 8) {
          header(workout)
          metrics
          if let restEndsAt = model.restEndsAt {
            RestRow(label: model.labels.rest, endsAt: restEndsAt)
            if model.canSkipRest {
              Button(model.labels.skipRest ?? "Skip rest") { model.skipRest() }
                .frame(maxWidth: .infinity, minHeight: 44)
            } else if !model.isPaused {
              Text(model.labels.skipUnsupported ?? "Skip this rest on your iPhone")
                .font(.footnote).foregroundStyle(textMuted)
            }
          }
          if model.skipPending {
            Text(model.labels.skipPending ?? "Waiting for your iPhone to confirm the skip…")
              .font(.footnote).foregroundStyle(textMuted)
          }
          currentSet
          controls
        }
      }
    } else {
      Text(model.labels.waiting)
        .multilineTextAlignment(.center)
        .foregroundStyle(textMuted)
    }
  }

  private func header(_ workout: WatchContext) -> some View {
    VStack(alignment: .leading, spacing: 2) {
      HStack {
        Text(workout.routineName ?? "")
          .font(.caption.weight(.semibold))
          .foregroundStyle(textMuted)
          .lineLimit(1)
        Spacer(minLength: 0)
        if model.isPaused {
          Text(model.labels.paused)
            .font(.caption2.weight(.semibold))
            .foregroundStyle(accent)
        }
      }
      ElapsedText(workout: workout)
        .font(.title2.weight(.bold).monospacedDigit())
        .foregroundStyle(.white)
    }
  }

  private var metrics: some View {
    HStack(spacing: 10) {
      // EF-2: no reading (or no permission) hides the heart rate — never 0.
      if let heartRate = model.heartRate {
        Label("\(Int(heartRate.rounded()))", systemImage: "heart.fill")
          .foregroundStyle(.red)
      }
      if let kcal = model.activeKcal {
        Text("\(Int(kcal.rounded())) kcal")
          .foregroundStyle(accent)
      }
    }
    .font(.footnote.weight(.semibold).monospacedDigit())
  }

  @ViewBuilder
  private var currentSet: some View {
    if let set = model.currentSet {
      VStack(alignment: .leading, spacing: 2) {
        Text(set.exerciseName)
          .font(.headline)
          .lineLimit(2)
        if let planned = set.reps {
          Text([set.setTitle, set.load ?? ""].filter { !$0.isEmpty }.joined(separator: " · "))
            .font(.footnote)
            .foregroundStyle(textMuted)
          RepsControl(setId: set.setId, planned: planned, unit: model.labels.reps ?? "reps", reps: $reps)
            .disabled(model.isPaused)
        } else {
          Text([set.setTitle, set.target].filter { !$0.isEmpty }.joined(separator: " · "))
            .font(.footnote)
            .foregroundStyle(textMuted)
        }
        Button {
          model.tickCurrentSet(reps: reps)
        } label: {
          Label(model.labels.done, systemImage: "checkmark")
            .frame(maxWidth: .infinity)
            .foregroundStyle(onPrimary)
        }
        .tint(primary)
        .buttonStyle(.borderedProminent)
        .disabled(model.isPaused)
        // watchOS caps a button's width, so in this leading stack it would
        // hug the left edge; centred it lines up with Pause below.
        .frame(maxWidth: .infinity)
      }
    } else if model.tickedSetId == nil {
      Text(model.labels.allDone)
        .font(.footnote)
        .foregroundStyle(textMuted)
    } else if model.waitingForPhone {
      // Spec 0045 FR-4: the next set has not come from the phone.
      Text(model.labels.waitingPhone ?? WatchContext.Labels.fallback.waitingPhone ?? "")
        .font(.footnote)
        .foregroundStyle(textMuted)
    }
  }

  private var controls: some View {
    VStack(spacing: 6) {
      Button {
        model.togglePause()
      } label: {
        Label(
          model.isPaused ? model.labels.resume : model.labels.pause,
          systemImage: model.isPaused ? "play.fill" : "pause.fill"
        )
        .frame(maxWidth: .infinity)
      }
      Button {
        model.requestFinish()
      } label: {
        Label(model.labels.finish, systemImage: "flag.checkered")
          .frame(maxWidth: .infinity)
      }
      if model.finishAsked {
        Text(model.labels.finishOnPhone)
          .font(.footnote)
          .foregroundStyle(accent)
      }
      Button {
        model.discardUnreachable = false
        showsMenu = true
      } label: {
        Label(model.labels.more ?? "More", systemImage: "ellipsis")
          .frame(maxWidth: .infinity)
      }
      .buttonStyle(.plain)
      .foregroundStyle(textMuted)
      .padding(.top, 4)
    }
    .sheet(isPresented: $showsMenu) {
      menu
    }
  }

  /// Discard behind its own confirmation, naming the sets that will be lost;
  /// with the phone out of reach it is not offered at all (EF-8).
  private var menu: some View {
    VStack(spacing: 8) {
      if model.discardUnreachable || !model.canReachPhone {
        Text(model.labels.connectToDiscard ?? "Connect to your iPhone to discard")
          .font(.footnote)
          .multilineTextAlignment(.center)
          .foregroundStyle(accent)
      } else {
        Button(role: .destructive) {
          confirmsDiscard = true
        } label: {
          Label(model.labels.discard ?? "Discard", systemImage: "trash")
            .frame(maxWidth: .infinity)
        }
      }
    }
    .confirmationDialog(
      model.labels.discardTitle ?? "Discard this workout?",
      isPresented: $confirmsDiscard,
      titleVisibility: .visible
    ) {
      Button(model.labels.discard ?? "Discard", role: .destructive) {
        model.requestDiscard()
        if !model.discardUnreachable {
          showsMenu = false
        }
      }
      Button(model.labels.cancel ?? "Cancel", role: .cancel) {}
    } message: {
      Text(model.activeWorkout?.discardMessage ?? "")
    }
  }
}

/// Counts up on the system clock, paused stretches left out (as on the phone).
private struct ElapsedText: View {
  let workout: WatchContext

  var body: some View {
    let started = workout.startedAtMs.map(Date.init(epochMs:)) ?? Date()
    let start = started.addingTimeInterval(workout.pausedSeconds ?? 0)
    Text(
      timerInterval: start...start.addingTimeInterval(12 * 3600),
      pauseTime: workout.pausedAtMs.map(Date.init(epochMs:)),
      countsDown: false
    )
  }
}

/// The reps of the set to do (spec 0041 FR-10, FR-11): − and + and the
/// crown, one rep at a time between 0 and 100. Each new set starts from its
/// own planned reps (FR-14).
private struct RepsControl: View {
  let setId: String
  let planned: Int
  let unit: String
  @Binding var reps: Int
  @State private var crown = 0.0
  @State private var shownSetId: String?

  var body: some View {
    HStack(spacing: 6) {
      step(-1, systemImage: "minus")
      VStack(spacing: 0) {
        Text("\(reps)")
          .font(.title2.weight(.bold).monospacedDigit())
          .foregroundStyle(.white)
        Text(unit)
          .font(.caption2)
          .foregroundStyle(textMuted)
      }
      .frame(maxWidth: .infinity)
      .focusable(true)
      .digitalCrownRotation(
        $crown, from: 0, through: 100, by: 1, sensitivity: .low,
        isContinuous: false, isHapticFeedbackEnabled: true
      )
      .onChange(of: crown) { _, value in
        reps = Int(value.rounded())
      }
      step(1, systemImage: "plus")
    }
    .onAppear(perform: seed)
    .onChange(of: setId) { _, _ in seed() }
    .accessibilityElement(children: .combine)
    .accessibilityValue("\(reps)")
    .accessibilityAdjustableAction { direction in
      switch direction {
      case .increment: change(by: 1)
      case .decrement: change(by: -1)
      @unknown default: break
      }
    }
  }

  private func step(_ delta: Int, systemImage: String) -> some View {
    Button {
      change(by: delta)
    } label: {
      Image(systemName: systemImage)
        .font(.body.weight(.bold))
        .frame(width: 34, height: 34)
    }
    .buttonStyle(.bordered)
    .clipShape(Circle())
  }

  private func change(by delta: Int) {
    reps = min(max(reps + delta, 0), 100)
    crown = Double(reps)
  }

  private func seed() {
    guard shownSetId != setId else { return }
    shownSetId = setId
    reps = min(max(planned, 0), 100)
    crown = Double(reps)
  }
}

private struct RestRow: View {
  let label: String
  let endsAt: Date

  var body: some View {
    HStack(spacing: 4) {
      Image(systemName: "timer")
      Text(label)
      Spacer(minLength: 0)
      Text(timerInterval: min(Date(), endsAt)...endsAt, countsDown: true)
        .monospacedDigit()
    }
    .font(.headline)
    .foregroundStyle(accent)
  }
}
