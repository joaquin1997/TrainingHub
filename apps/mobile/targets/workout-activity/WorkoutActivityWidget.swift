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
private let success = Color(red: 0x66 / 255, green: 0xE2 / 255, blue: 0x87 / 255)

/// "Discard" on the lock screen opens the app on a confirmation for this
/// workout; it never discards by itself (spec 0035 FR-20, FR-21).
private func discardWorkoutURL(_ workoutId: String) -> URL {
  var components = URLComponents(string: "traininghub://workouts/active")!
  components.queryItems = [
    URLQueryItem(name: "action", value: "discard"),
    URLQueryItem(name: "workoutId", value: workoutId),
  ]
  return components.url ?? activeWorkoutURL
}

/// The app's brand mark: the pulse of the app icon (spec 0035 FR-13), drawn
/// as a line so it stays sharp at any size and takes the tint it is given.
private struct BrandMarkShape: Shape {
  /// The pulse of the Ionicons glyph, traced on a 280 × 250 box.
  static let points: [CGPoint] = [
    CGPoint(x: 0, y: 165), CGPoint(x: 48, y: 165), CGPoint(x: 85, y: 0),
    CGPoint(x: 125, y: 250), CGPoint(x: 165, y: 98), CGPoint(x: 182, y: 165),
    CGPoint(x: 245, y: 165),
  ]
  static let box = CGSize(width: 280, height: 250)

  func path(in rect: CGRect) -> Path {
    let scale = min(rect.width / Self.box.width, rect.height / Self.box.height)
    let origin = CGPoint(
      x: rect.midX - Self.box.width * scale / 2,
      y: rect.midY - Self.box.height * scale / 2
    )
    let mapped = Self.points.map { CGPoint(x: origin.x + $0.x * scale, y: origin.y + $0.y * scale) }
    var path = Path()
    path.addLines(mapped)
    return path
  }
}

/// The dot that ends the pulse.
private struct BrandMarkDot: Shape {
  func path(in rect: CGRect) -> Path {
    let box = BrandMarkShape.box
    let scale = min(rect.width / box.width, rect.height / box.height)
    let center = CGPoint(
      x: rect.midX - box.width * scale / 2 + 248 * scale,
      y: rect.midY - box.height * scale / 2 + 165 * scale
    )
    let radius = 32 * scale
    return Path(ellipseIn: CGRect(x: center.x - radius, y: center.y - radius, width: radius * 2, height: radius * 2))
  }
}

/// The mark in lime, decorative (not read by VoiceOver).
private struct BrandMark: View {
  var size: CGFloat = 16
  var color: Color = primary

  var body: some View {
    ZStack {
      BrandMarkShape()
        .stroke(color, style: StrokeStyle(lineWidth: max(1.5, size / 8), lineCap: .round, lineJoin: .round))
      BrandMarkDot()
        .fill(color)
    }
    .frame(width: size, height: size)
    .accessibilityHidden(true)
  }
}

/// Sets done over all sets, as a ring with the count (spec 0035 FR-14).
private struct SetsRing: View {
  let done: Int
  let total: Int
  let label: String?
  var size: CGFloat = 52

  var body: some View {
    let fraction = total > 0 ? Double(done) / Double(total) : 0
    ZStack {
      Circle()
        .stroke(Color.white.opacity(0.18), lineWidth: size / 10)
      Circle()
        .trim(from: 0, to: fraction)
        .stroke(success, style: StrokeStyle(lineWidth: size / 10, lineCap: .round))
        .rotationEffect(.degrees(-90))
      Text("\(done)/\(total)")
        .font(.system(size: size / 4.2, weight: .bold).monospacedDigit())
        .foregroundStyle(.white)
        .minimumScaleFactor(0.6)
        .lineLimit(1)
        .padding(.horizontal, 4)
    }
    .frame(width: size, height: size)
    .accessibilityElement(children: .ignore)
    .accessibilityLabel(label ?? "\(done)/\(total)")
  }
}

/// The up-next set, or "All sets done" once none is left.
private func upNextText(_ context: ActivityViewContext<WorkoutActivityAttributes>) -> String? {
  if let upNext = context.state.upNext { return upNext }
  // Before spec 0035 the state carries no progress: show nothing.
  guard context.state.setsTotal != nil else { return nil }
  return context.attributes.allDoneLabel
}

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
          HStack(spacing: 4) {
            BrandMark(size: 14)
            Text(context.attributes.routineName)
              .lineLimit(1)
          }
          .font(.caption)
          .foregroundStyle(textMuted)
        }
        DynamicIslandExpandedRegion(.trailing) {
          VStack(alignment: .trailing, spacing: 2) {
            if let done = context.state.setsDone, let total = context.state.setsTotal {
              Text("\(done)/\(total)")
                .font(.caption.weight(.semibold).monospacedDigit())
                .foregroundStyle(success)
                .accessibilityLabel(context.state.setsLabel ?? "\(done)/\(total)")
            }
            KcalText(kcal: context.state.activeKcal)
              .font(.caption)
              .foregroundStyle(accent)
          }
        }
        DynamicIslandExpandedRegion(.center) {
          // During a rest the countdown is the figure (FR-15).
          if let restEndsAt = runningRest(context) {
            RestCountdown(endsAt: restEndsAt)
              .font(.title2.monospacedDigit().weight(.bold))
              .foregroundStyle(accent)
          } else {
            ElapsedText(attributes: context.attributes, state: context.state)
              .font(.title2.monospacedDigit().weight(.semibold))
              .foregroundStyle(.white)
          }
        }
        DynamicIslandExpandedRegion(.bottom) {
          VStack(spacing: 6) {
            if let upNext = upNextText(context) {
              Text(runningRest(context) != nil ? "\(context.attributes.nextLabel ?? "Next"): \(upNext)" : upNext)
                .font(.caption.weight(.semibold))
                .foregroundStyle(.white)
                .lineLimit(1)
            }
            ControlsRow(attributes: context.attributes, state: context.state)
          }
        }
      } compactLeading: {
        // The mark leads; a paused workout shows that it is paused (FR-16).
        if context.state.pausedAt != nil {
          Image(systemName: "pause.fill")
            .foregroundStyle(primary)
        } else {
          BrandMark(size: 16)
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
        if let restEndsAt = runningRest(context) {
          RestCountdown(endsAt: restEndsAt)
            .font(.caption2.monospacedDigit())
            .foregroundStyle(accent)
            .frame(maxWidth: 36)
            .minimumScaleFactor(0.6)
        } else {
          BrandMark(size: 16)
        }
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
        if context.state.pausedAt == nil {
          BrandMark(size: 12)
        } else {
          Image(systemName: "pause.fill")
            .foregroundStyle(primary)
        }
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
      // The up-next set and the sets done, when they fit (spec 0035 FR-18).
      if let upNext = upNextText(context) {
        Text(upNext)
          .font(.caption2)
          .foregroundStyle(.white)
          .lineLimit(1)
      }
      HStack(spacing: 4) {
        if let done = context.state.setsDone, let total = context.state.setsTotal, runningRest(context) == nil {
          Text("\(done)/\(total)")
            .foregroundStyle(success)
        }
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
    VStack(alignment: .leading, spacing: 8) {
      HStack(spacing: 6) {
        BrandMark(size: 16)
        Text(context.attributes.routineName)
          .font(.subheadline.weight(.semibold))
          .foregroundStyle(textMuted)
          .lineLimit(1)
        if context.state.pausedAt != nil {
          Text(context.attributes.pausedLabel)
            .font(.caption.weight(.semibold))
            .foregroundStyle(accent)
        }
        Spacer(minLength: 8)
        // Small, unfilled and away from Pause: the least likely control to be
        // hit by accident (FR-19). Opens the app on a confirmation (FR-20).
        if let discard = context.attributes.discardLabel {
          Link(destination: discardWorkoutURL(context.attributes.workoutId)) {
            Text(discard)
              .font(.caption)
              .underline()
              .foregroundStyle(textMuted)
          }
        }
      }
      if let restEndsAt = runningRest(context) {
        // During a rest the orange countdown is the largest figure (FR-15).
        HStack(alignment: .center) {
          VStack(alignment: .leading, spacing: 2) {
            RestCountdown(endsAt: restEndsAt)
              .font(.system(size: 40, weight: .bold).monospacedDigit())
              .foregroundStyle(accent)
            if let upNext = upNextText(context) {
              Text("\(context.attributes.nextLabel ?? "Next"): \(upNext)")
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(.white)
                .lineLimit(1)
            }
          }
          Spacer(minLength: 8)
          VStack(alignment: .trailing, spacing: 2) {
            ElapsedText(attributes: context.attributes, state: context.state)
              .font(.subheadline.weight(.semibold).monospacedDigit())
              .foregroundStyle(textMuted)
              .multilineTextAlignment(.trailing)
            KcalText(kcal: context.state.activeKcal)
              .font(.caption.weight(.semibold))
              .foregroundStyle(accent)
          }
          .frame(maxWidth: 90, alignment: .trailing)
        }
      } else {
        HStack(alignment: .center, spacing: 12) {
          VStack(alignment: .leading, spacing: 2) {
            if let upNext = upNextText(context) {
              Text(upNext)
                .font(.headline)
                .foregroundStyle(.white)
                .lineLimit(1)
            }
            HStack(alignment: .firstTextBaseline) {
              ElapsedText(attributes: context.attributes, state: context.state)
                .font(.system(size: 34, weight: .bold).monospacedDigit())
                .foregroundStyle(.white)
              Spacer(minLength: 4)
              KcalText(kcal: context.state.activeKcal)
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(accent)
            }
          }
          if let done = context.state.setsDone, let total = context.state.setsTotal {
            SetsRing(done: done, total: total, label: context.state.setsLabel)
          }
        }
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
