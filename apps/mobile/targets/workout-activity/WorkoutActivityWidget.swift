import ActivityKit
import AppIntents
import SwiftUI
import WidgetKit

private let activeWorkoutURL = URL(string: "traininghub://workouts/active")!
private let finishWorkoutURL = URL(string: "traininghub://workouts/active?action=finish")!

private let primary = Color(red: 0xC8 / 255, green: 0xFF / 255, blue: 0x2E / 255)
private let onPrimary = Color(red: 0x10 / 255, green: 0x14 / 255, blue: 0x0D / 255)
private let background = Color(red: 0x10 / 255, green: 0x14 / 255, blue: 0x18 / 255)
private let textMuted = Color(red: 0xA7 / 255, green: 0xB0 / 255, blue: 0xBE / 255)
private let accent = Color(red: 0xFF / 255, green: 0x8A / 255, blue: 0x3D / 255)

struct WorkoutActivityWidget: Widget {
  var body: some WidgetConfiguration {
    ActivityConfiguration(for: WorkoutActivityAttributes.self) { context in
      LockScreenView(context: context)
        .activityBackgroundTint(background)
        .activitySystemActionForegroundColor(.white)
        .widgetURL(activeWorkoutURL)
    } dynamicIsland: { context in
      DynamicIsland {
        DynamicIslandExpandedRegion(.leading) {
          Label(context.attributes.routineName, systemImage: "dumbbell.fill")
            .font(.caption)
            .foregroundStyle(textMuted)
            .lineLimit(1)
        }
        DynamicIslandExpandedRegion(.trailing) {
          KcalText(kcal: context.state.activeKcal)
            .font(.caption)
            .foregroundStyle(accent)
        }
        DynamicIslandExpandedRegion(.center) {
          ElapsedText(attributes: context.attributes, state: context.state)
            .font(.title2.monospacedDigit().weight(.semibold))
            .foregroundStyle(.white)
        }
        DynamicIslandExpandedRegion(.bottom) {
          ControlsRow(attributes: context.attributes, state: context.state)
        }
      } compactLeading: {
        Image(systemName: context.state.pausedAt == nil ? "dumbbell.fill" : "pause.fill")
          .foregroundStyle(primary)
      } compactTrailing: {
        ElapsedText(attributes: context.attributes, state: context.state)
          .font(.caption.monospacedDigit())
          .foregroundStyle(.white)
          .frame(maxWidth: 56)
      } minimal: {
        Image(systemName: "dumbbell.fill")
          .foregroundStyle(primary)
      }
      .widgetURL(activeWorkoutURL)
    }
  }
}

private struct LockScreenView: View {
  let context: ActivityViewContext<WorkoutActivityAttributes>

  var body: some View {
    VStack(alignment: .leading, spacing: 10) {
      HStack {
        Label(context.attributes.routineName, systemImage: "dumbbell.fill")
          .font(.subheadline.weight(.semibold))
          .foregroundStyle(textMuted)
          .lineLimit(1)
        Spacer()
        if context.state.pausedAt != nil {
          Text(context.attributes.pausedLabel)
            .font(.caption.weight(.semibold))
            .foregroundStyle(accent)
        }
      }
      HStack(alignment: .firstTextBaseline) {
        ElapsedText(attributes: context.attributes, state: context.state)
          .font(.system(size: 34, weight: .bold).monospacedDigit())
          .foregroundStyle(.white)
        Spacer()
        KcalText(kcal: context.state.activeKcal)
          .font(.title3.weight(.semibold))
          .foregroundStyle(accent)
      }
      ControlsRow(attributes: context.attributes, state: context.state)
    }
    .padding(16)
  }
}

/// Counts up on the system clock, so it keeps running while the app is suspended.
private struct ElapsedText: View {
  let attributes: WorkoutActivityAttributes
  let state: WorkoutActivityAttributes.ContentState

  var body: some View {
    let start = attributes.startedAt.addingTimeInterval(state.pausedSeconds)
    Text(
      timerInterval: start...start.addingTimeInterval(12 * 3600),
      pauseTime: state.pausedAt,
      countsDown: false
    )
  }
}

private struct KcalText: View {
  let kcal: Int?

  var body: some View {
    Text(kcal.map { "\($0) kcal" } ?? "— kcal")
  }
}

private struct ControlsRow: View {
  let attributes: WorkoutActivityAttributes
  let state: WorkoutActivityAttributes.ContentState

  var body: some View {
    HStack(spacing: 10) {
      if state.pausedAt == nil {
        Button(intent: PauseWorkoutIntent(workoutId: attributes.workoutId)) {
          Label(attributes.pauseLabel, systemImage: "pause.fill")
            .frame(maxWidth: .infinity)
        }
        .tint(.white.opacity(0.2))
      } else {
        Button(intent: ResumeWorkoutIntent(workoutId: attributes.workoutId)) {
          Label(attributes.resumeLabel, systemImage: "play.fill")
            .frame(maxWidth: .infinity)
        }
        .tint(.white.opacity(0.2))
      }
      Link(destination: finishWorkoutURL) {
        Label(attributes.finishLabel, systemImage: "flag.checkered")
          .font(.subheadline.weight(.semibold))
          .frame(maxWidth: .infinity, minHeight: 34)
          .foregroundStyle(onPrimary)
          .background(primary, in: Capsule())
      }
    }
    .font(.subheadline.weight(.semibold))
    .buttonStyle(.borderedProminent)
    .buttonBorderShape(.capsule)
  }
}
