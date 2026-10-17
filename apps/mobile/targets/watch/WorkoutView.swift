import SwiftUI

private let primary = Color(red: 0xC8 / 255, green: 0xFF / 255, blue: 0x2E / 255)
private let onPrimary = Color(red: 0x10 / 255, green: 0x14 / 255, blue: 0x0D / 255)
private let textMuted = Color(red: 0xA7 / 255, green: 0xB0 / 255, blue: 0xBE / 255)
private let accent = Color(red: 0xFF / 255, green: 0x8A / 255, blue: 0x3D / 255)

/// One screen: clock, heart rate, calories, rest, the set to do and the
/// controls (spec 0025 FR-3, FR-4). Weights and reps are confirmed as
/// planned, never edited here (out of scope).
struct WorkoutView: View {
  @ObservedObject var model: WorkoutModel
  /// The secondary menu (spec 0035 FR-22): Discard is never a main control.
  @State private var showsMenu = false
  @State private var confirmsDiscard = false

  var body: some View {
    if let workout = model.activeWorkout {
      ScrollView {
        VStack(alignment: .leading, spacing: 8) {
          header(workout)
          metrics
          if let restEndsAt = model.restEndsAt {
            RestRow(label: model.labels.rest, endsAt: restEndsAt)
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
        Text([set.setTitle, set.target].filter { !$0.isEmpty }.joined(separator: " · "))
          .font(.footnote)
          .foregroundStyle(textMuted)
        Button {
          model.tickCurrentSet()
        } label: {
          Label(model.labels.done, systemImage: "checkmark")
            .frame(maxWidth: .infinity)
            .foregroundStyle(onPrimary)
        }
        .tint(primary)
        .buttonStyle(.borderedProminent)
        .disabled(model.isPaused)
      }
    } else if model.tickedSetId == nil {
      Text(model.labels.allDone)
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
