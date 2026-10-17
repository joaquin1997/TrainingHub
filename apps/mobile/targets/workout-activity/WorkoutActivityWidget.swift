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
      FamilyAwareView(context: context)
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
        if runningRest(context) != nil {
          Image(systemName: "timer")
            .foregroundStyle(accent)
        } else {
          Image(systemName: context.state.pausedAt == nil ? "dumbbell.fill" : "pause.fill")
            .foregroundStyle(primary)
        }
      } compactTrailing: {
        if let restEndsAt = runningRest(context) {
          RestCountdown(endsAt: restEndsAt)
            .font(.caption.monospacedDigit())
            .foregroundStyle(accent)
            .frame(maxWidth: 56)
        } else {
          ElapsedText(attributes: context.attributes, state: context.state)
            .font(.caption.monospacedDigit())
            .foregroundStyle(.white)
            .frame(maxWidth: 56)
        }
      } minimal: {
        Image(systemName: "dumbbell.fill")
          .foregroundStyle(primary)
      }
      .widgetURL(activeWorkoutURL)
    }
    .watchSmartStackFamily()
  }
}

extension WidgetConfiguration {
  /// Declares the small family, so the paired Apple Watch's Smart Stack shows
  /// our own layout instead of the compact Dynamic Island views (spec 0025
  /// FR-1). iOS 18+; the extension still deploys to iOS 17.
  func watchSmartStackFamily() -> some WidgetConfiguration {
    if #available(iOS 18.0, *) {
      return supplementalActivityFamilies([.small])
    } else {
      return self
    }
  }
}

/// The iPhone lock screen, or the small layout where the system asks for it
/// (the Apple Watch Smart Stack).
private struct FamilyAwareView: View {
  let context: ActivityViewContext<WorkoutActivityAttributes>

  var body: some View {
    if #available(iOS 18.0, *) {
      FamilySwitch(context: context)
    } else {
      LockScreenView(context: context)
    }
  }
}

@available(iOS 18.0, *)
private struct FamilySwitch: View {
  let context: ActivityViewContext<WorkoutActivityAttributes>
  @Environment(\.activityFamily) private var family

  var body: some View {
    switch family {
    case .small:
      WatchSmallView(context: context)
    default:
      LockScreenView(context: context)
    }
  }
}

/// Read-only status for the watch (spec 0025 Level 1): routine, clock, rest
/// countdown while one runs, calories when known. Pause and Finish stay on the
/// phone's surfaces.
private struct WatchSmallView: View {
  let context: ActivityViewContext<WorkoutActivityAttributes>

  var body: some View {
    VStack(alignment: .leading, spacing: 2) {
      HStack(spacing: 4) {
        Image(systemName: context.state.pausedAt == nil ? "dumbbell.fill" : "pause.fill")
          .foregroundStyle(primary)
        Text(context.attributes.routineName)
          .foregroundStyle(textMuted)
          .lineLimit(1)
        Spacer(minLength: 0)
        if context.state.pausedAt != nil {
          Text(context.attributes.pausedLabel)
            .foregroundStyle(accent)
            .lineLimit(1)
        }
      }
      .font(.caption2.weight(.semibold))
      ElapsedText(attributes: context.attributes, state: context.state)
        .font(.title2.weight(.bold).monospacedDigit())
        .foregroundStyle(.white)
        .lineLimit(1)
        .minimumScaleFactor(0.7)
      HStack(spacing: 4) {
        if let restEndsAt = runningRest(context) {
          Image(systemName: "timer")
          RestCountdown(endsAt: restEndsAt)
            .lineLimit(1)
        }
        Spacer(minLength: 0)
        // Unknown calories are left out here, not shown as "— kcal".
        if let kcal = context.state.activeKcal {
          Text("\(kcal) kcal")
            .lineLimit(1)
        }
      }
      .font(.caption.weight(.semibold).monospacedDigit())
      .foregroundStyle(accent)
    }
    .padding(.horizontal, 4)
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
      if let restEndsAt = runningRest(context) {
        HStack(spacing: 6) {
          Image(systemName: "timer")
          RestCountdown(endsAt: restEndsAt)
        }
        .font(.title3.weight(.semibold).monospacedDigit())
        .foregroundStyle(accent)
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

/// The running rest's end, or nil once it has passed (spec 0018 FR-8). Every
/// update sets the rest's end as the stale date, so the system re-renders the
/// activity as stale at that instant even with the app suspended.
///
/// TODO(sdd): Live Activity after the rest ends with the app suspended relies
/// on staleDate re-rendering the widget with isStale; unverified on the device
/// — worst case the row shows 0:00 until the app next updates the activity.
private func runningRest(_ context: ActivityViewContext<WorkoutActivityAttributes>) -> Date? {
  guard let restEndsAt = context.state.restEndsAt, !context.isStale else { return nil }
  return restEndsAt
}

/// Counts down to the end of the rest on the system clock.
private struct RestCountdown: View {
  let endsAt: Date

  var body: some View {
    // A range needs its start before its end, also when rendered just after it.
    Text(timerInterval: min(Date(), endsAt)...endsAt, countsDown: true)
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
