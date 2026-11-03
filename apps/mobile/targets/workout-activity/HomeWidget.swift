import SwiftUI
import WidgetKit

// The home-screen and lock-screen widget (spec 0036, redesigned by 0041). The
// app writes a JSON snapshot to the App Group (`modules/home-widget`, built in
// JS by `features/homeWidget/snapshot.ts`); the widget only reads it and opens
// the app. Without the App Group nothing arrives and it shows the brand.

private let homeAppGroup = "group.com.joaquin.traininghub"
private let homeSnapshotKey = "homeWidgetSnapshot"

private let routinesURL = URL(string: "traininghub://routines")!
private let activeURL = URL(string: "traininghub://workouts/active")!
private let createURL = URL(string: "traininghub://routines/create")!

private func startURL(_ routineId: String) -> URL {
  var components = URLComponents(string: "traininghub://routines")!
  components.queryItems = [URLQueryItem(name: "start", value: routineId)]
  return components.url ?? routinesURL
}

private func hex(_ value: UInt32) -> Color {
  Color(
    red: Double((value >> 16) & 0xFF) / 255,
    green: Double((value >> 8) & 0xFF) / 255,
    blue: Double(value & 0xFF) / 255
  )
}

/// The app's colours for each mode (spec 0041 FR-2, tokens of spec 0038).
struct HomePalette {
  let ground: Color
  let raised: Color
  let text: Color
  let muted: Color
  /// The brand lime fill, the same in both modes, with dark text on it.
  let lime: Color
  let onLime: Color
  /// Lime as text, icon or ring: the lime itself on dark, a dark ink on light.
  let ink: Color
  let accent: Color
  let track: Color

  static let dark = HomePalette(
    ground: hex(0x151A21),
    raised: hex(0x1D2530),
    text: hex(0xF7FAF2),
    muted: hex(0xA7B0BE),
    lime: hex(0xC8FF2E),
    onLime: hex(0x10140D),
    ink: hex(0xC8FF2E),
    accent: hex(0xFF8A3D),
    track: hex(0x2C3543)
  )

  static let light = HomePalette(
    ground: hex(0xFFFFFF),
    raised: hex(0xEAEEE7),
    text: hex(0x12171D),
    muted: hex(0x454E5A),
    lime: hex(0xC8FF2E),
    onLime: hex(0x10140D),
    ink: hex(0x3F6300),
    accent: hex(0xA34700),
    track: hex(0xD6DBD2)
  )

  static func of(_ scheme: ColorScheme) -> HomePalette {
    scheme == .dark ? .dark : .light
  }
}

struct HomeSnapshot: Codable {
  struct Today: Codable {
    let id: String
    let name: String
    // Spec 0041; optional so a snapshot from an older app build decodes.
    var exercises: [String]? = nil
    var lastDoneMs: Double? = nil
  }

  struct History: Codable {
    let weekStartMs: Double
    let days: [Bool]
    let setsThisWeek: Int
    let streak: Int
    let weekHadWorkout: Bool
    let today: Today?
    let hasRoutines: Bool
    var workoutsThisWeek: Int? = nil
  }

  struct Active: Codable {
    let routineName: String
    let startedAtMs: Double
    let pausedAtMs: Double?
    let pausedSeconds: Double
    var setsDone: Int? = nil
    var setsTotal: Int? = nil
    var upNext: String? = nil
    var restEndsAtMs: Double? = nil
  }

  struct Labels: Codable {
    let start: String
    let setsThisWeek: String
    let streak: String
    let createRoutine: String
    let signIn: String
    let openApp: String
    let paused: String
    let weekdays: [String]
    var today: String? = nil
    var next: String? = nil
    var rest: String? = nil
    var allDone: String? = nil
    var exerciseCount: String? = nil
    var lastTime: String? = nil
    var firstTime: String? = nil
    var workoutsThisWeek: String? = nil
    var sets: String? = nil
    var more: String? = nil
    var noRoutine: String? = nil
  }

  let v: Int
  let signedIn: Bool
  let history: History?
  let active: Active?
  let labels: Labels

  static func read() -> HomeSnapshot? {
    guard let json = UserDefaults(suiteName: homeAppGroup)?.string(forKey: homeSnapshotKey),
          let data = json.data(using: .utf8)
    else { return nil }
    return try? JSONDecoder().decode(HomeSnapshot.self, from: data)
  }
}

/// This week's figures as of `date` (0036 FR-14): a new week without the app
/// opened shows an empty week; the streak carries on only through last week.
struct WeekFigures {
  let days: [Bool]
  let sets: Int
  let workouts: Int
  let streak: Int
  /// 0 = Monday … 6 = Sunday.
  let todayIndex: Int

  init(history: HomeSnapshot.History, at date: Date) {
    var calendar = Calendar(identifier: .gregorian)
    calendar.firstWeekday = 2
    let snapshotWeek = Date(timeIntervalSince1970: history.weekStartMs / 1000)
    let currentWeek = calendar.dateInterval(of: .weekOfYear, for: date)?.start ?? snapshotWeek
    let weeks = calendar.dateComponents([.weekOfYear], from: calendar.startOfDay(for: snapshotWeek), to: currentWeek).weekOfYear ?? 0
    let weekday = calendar.component(.weekday, from: date)
    todayIndex = (weekday + 5) % 7
    switch weeks {
    case ..<1:
      days = history.days
      sets = history.setsThisWeek
      workouts = history.workoutsThisWeek ?? history.days.filter { $0 }.count
      streak = history.streak
    case 1:
      days = Array(repeating: false, count: 7)
      sets = 0
      workouts = 0
      streak = history.weekHadWorkout ? history.streak : 0
    default:
      days = Array(repeating: false, count: 7)
      sets = 0
      workouts = 0
      streak = 0
    }
  }

  var daysTrained: Int { days.filter { $0 }.count }
}

struct HomeEntry: TimelineEntry {
  let date: Date
  let snapshot: HomeSnapshot?
}

struct HomeProvider: TimelineProvider {
  func placeholder(in context: Context) -> HomeEntry {
    HomeEntry(date: Date(), snapshot: nil)
  }

  func getSnapshot(in context: Context, completion: @escaping (HomeEntry) -> Void) {
    completion(HomeEntry(date: Date(), snapshot: HomeSnapshot.read()))
  }

  /// Now; the end of a running rest, so its countdown goes away even with the
  /// app closed (0041 FR-6); and each of the next two Mondays at 00:00, so a
  /// new week shows empty without the app being opened (0036 FR-14).
  func getTimeline(in context: Context, completion: @escaping (Timeline<HomeEntry>) -> Void) {
    let snapshot = HomeSnapshot.read()
    var calendar = Calendar(identifier: .gregorian)
    calendar.firstWeekday = 2
    let now = Date()
    var dates = [now]
    if let restEnd = snapshot?.active?.restEndsAtMs.map(Date.init(epochMs:)), restEnd > now {
      dates.append(restEnd)
    }
    if let week = calendar.dateInterval(of: .weekOfYear, for: now) {
      dates.append(week.end)
      if let after = calendar.date(byAdding: .weekOfYear, value: 1, to: week.end) {
        dates.append(after)
      }
    }
    let entries = dates.sorted().map { HomeEntry(date: $0, snapshot: snapshot) }
    completion(Timeline(entries: entries, policy: .never))
  }
}

private extension Date {
  init(epochMs: Double) {
    self.init(timeIntervalSince1970: epochMs / 1000)
  }
}

struct HomeWidget: Widget {
  var body: some WidgetConfiguration {
    StaticConfiguration(kind: "TrainingHubHome", provider: HomeProvider()) { entry in
      HomeWidgetView(entry: entry)
    }
    .configurationDisplayName("TrainingHub")
    .description("Your week, today's routine and the workout in progress.")
    .supportedFamilies([
      .systemSmall, .systemMedium, .systemLarge,
      .accessoryCircular, .accessoryRectangular, .accessoryInline,
    ])
  }
}

/// Reads the size and the mode, and draws `HomeWidgetContent` with them.
struct HomeWidgetView: View {
  let entry: HomeEntry
  @Environment(\.widgetFamily) private var family
  @Environment(\.colorScheme) private var scheme

  var body: some View {
    let palette = HomePalette.of(scheme)
    HomeWidgetContent(entry: entry, family: family, palette: palette)
      .containerBackground(palette.ground, for: .widget)
  }
}

// MARK: - Pieces

private struct HomeMark: View {
  var size: CGFloat = 14
  var color: Color

  var body: some View {
    ZStack {
      BrandMarkShape()
        .stroke(color, style: StrokeStyle(lineWidth: max(1.5, size / 8), lineCap: .round, lineJoin: .round))
      BrandMarkDot().fill(color)
    }
    .frame(width: size, height: size)
    .accessibilityHidden(true)
  }
}

/// Counts up on the system clock; stopped while paused (0036 FR-6).
private struct WorkoutClock: View {
  let active: HomeSnapshot.Active

  var body: some View {
    let start = Date(epochMs: active.startedAtMs).addingTimeInterval(active.pausedSeconds)
    Text(
      timerInterval: start...start.addingTimeInterval(12 * 3600),
      pauseTime: active.pausedAtMs.map(Date.init(epochMs:)),
      countsDown: false
    )
    .monospacedDigit()
  }
}

/// Counts down to the end of the rest.
private struct RestCountdown: View {
  let endsAt: Date
  let now: Date

  var body: some View {
    Text(timerInterval: min(now, endsAt)...endsAt, countsDown: true)
      .monospacedDigit()
  }
}

/// Sets done out of the total, as a ring (0041 FR-6).
private struct SetsRing: View {
  let done: Int
  let total: Int
  let palette: HomePalette
  var lineWidth: CGFloat = 8

  var body: some View {
    let progress = total > 0 ? Double(done) / Double(total) : 0
    ZStack {
      Circle().stroke(palette.track, lineWidth: lineWidth)
      Circle()
        .trim(from: 0, to: progress)
        .stroke(palette.ink, style: StrokeStyle(lineWidth: lineWidth, lineCap: .round))
        .rotationEffect(.degrees(-90))
        .widgetAccentable()
    }
  }
}

/// Monday to Sunday: a filled dot for a trained day, a ring otherwise, and
/// today outlined — never colour alone (0036 FR-16, 0034 FR-17).
private struct DayDots: View {
  let figures: WeekFigures
  let labels: [String]
  let palette: HomePalette
  var dotSize: CGFloat = 10
  var spacing: CGFloat = 6

  var body: some View {
    HStack(spacing: spacing) {
      ForEach(0..<7, id: \.self) { index in
        VStack(spacing: 3) {
          if labels.count == 7 {
            Text(labels[index])
              .font(.system(size: 10, weight: index == figures.todayIndex ? .bold : .regular))
              .foregroundStyle(index == figures.todayIndex ? palette.ink : palette.muted)
          }
          ZStack {
            if figures.days[safe: index] == true {
              Circle().fill(palette.ink).widgetAccentable()
            } else {
              Circle().stroke(palette.muted.opacity(0.55), lineWidth: 1.5)
            }
          }
          .frame(width: dotSize, height: dotSize)
          .padding(2)
          .overlay(
            Circle().stroke(index == figures.todayIndex ? palette.ink : .clear, lineWidth: 1)
          )
        }
      }
    }
    .accessibilityElement(children: .ignore)
  }
}

extension Array {
  subscript(safe index: Int) -> Element? {
    indices.contains(index) ? self[index] : nil
  }
}

// MARK: - Content

/// Everything the widget draws, for a given size and mode — kept apart from
/// the environment so it can be rendered outside WidgetKit for review.
struct HomeWidgetContent: View {
  let entry: HomeEntry
  let family: WidgetFamily
  let palette: HomePalette

  var body: some View {
    if let snapshot = entry.snapshot {
      if !snapshot.signedIn {
        message(snapshot.labels.signIn)
      } else if let active = snapshot.active {
        activeView(active, labels: snapshot.labels)
      } else if let history = snapshot.history {
        weekView(history, labels: snapshot.labels)
      } else {
        message(snapshot.labels.openApp)
      }
    } else {
      // No data yet (0036 EF-10): never placeholder figures.
      message("TrainingHub")
    }
  }

  // MARK: Message

  @ViewBuilder
  private func message(_ text: String) -> some View {
    switch family {
    case .accessoryCircular:
      HomeMark(size: 20, color: .primary).widgetURL(routinesURL)
    case .accessoryRectangular, .accessoryInline:
      Text(text).widgetURL(routinesURL)
    default:
      VStack(spacing: 10) {
        HomeMark(size: 30, color: palette.ink)
        Text(text)
          .font(.subheadline.weight(.semibold))
          .foregroundStyle(palette.text)
          .multilineTextAlignment(.center)
      }
      .frame(maxWidth: .infinity, maxHeight: .infinity)
      .widgetURL(routinesURL)
    }
  }

  // MARK: Workout in progress

  private func restEnd(_ active: HomeSnapshot.Active) -> Date? {
    guard let ms = active.restEndsAtMs else { return nil }
    let end = Date(epochMs: ms)
    // Gone once it has passed — never stuck at 0:00 (0040 FR-3).
    return end > entry.date ? end : nil
  }

  @ViewBuilder
  private func activeView(_ active: HomeSnapshot.Active, labels: HomeSnapshot.Labels) -> some View {
    let done = active.setsDone ?? 0
    let total = active.setsTotal ?? 0
    let rest = restEnd(active)
    switch family {
    case .accessoryInline:
      if let rest {
        Label { RestCountdown(endsAt: rest, now: entry.date) } icon: { Image(systemName: "timer") }
          .widgetURL(activeURL)
      } else {
        Label { WorkoutClock(active: active) } icon: { Image(systemName: "figure.strengthtraining.traditional") }
          .widgetURL(activeURL)
      }
    case .accessoryCircular:
      // No routine or exercise names on the lock screen (0036 FR-12).
      Gauge(value: Double(done), in: 0...Double(max(total, 1))) {
        Image(systemName: "figure.strengthtraining.traditional")
      } currentValueLabel: {
        Text("\(done)").font(.system(size: 16, weight: .bold)).monospacedDigit()
      }
      .gaugeStyle(.accessoryCircularCapacity)
      .widgetURL(activeURL)
    case .accessoryRectangular:
      VStack(alignment: .leading, spacing: 1) {
        HStack(spacing: 4) {
          Image(systemName: rest != nil ? "timer" : (active.pausedAtMs == nil ? "figure.strengthtraining.traditional" : "pause.fill"))
          if let rest {
            RestCountdown(endsAt: rest, now: entry.date)
          } else {
            WorkoutClock(active: active)
          }
        }
        .font(.headline)
        if total > 0 {
          Text("\(done)/\(total) \(labels.sets ?? "")")
            .font(.caption)
        }
      }
      .frame(maxWidth: .infinity, alignment: .leading)
      .widgetURL(activeURL)
    case .systemSmall:
      VStack(spacing: 6) {
        ZStack {
          SetsRing(done: done, total: total, palette: palette, lineWidth: 7)
          VStack(spacing: 0) {
            Text("\(done)/\(total)")
              .font(.system(size: 20, weight: .bold))
              .monospacedDigit()
              .foregroundStyle(palette.text)
            Text(labels.sets ?? "")
              .font(.caption2)
              .foregroundStyle(palette.muted)
          }
        }
        .frame(width: 84, height: 84)
        activeFigure(active, rest: rest, labels: labels, size: 20)
      }
      .frame(maxWidth: .infinity, maxHeight: .infinity)
      .widgetURL(activeURL)
    default:
      let large = family == .systemLarge
      VStack(spacing: large ? 18 : 0) {
        HStack(spacing: 16) {
          ZStack {
            SetsRing(done: done, total: total, palette: palette, lineWidth: large ? 11 : 9)
            VStack(spacing: 0) {
              Text("\(done)/\(total)")
                .font(.system(size: large ? 30 : 22, weight: .bold))
                .monospacedDigit()
                .foregroundStyle(palette.text)
              Text(labels.sets ?? "")
                .font(.caption)
                .foregroundStyle(palette.muted)
            }
          }
          .frame(width: large ? 130 : 96, height: large ? 130 : 96)

          VStack(alignment: .leading, spacing: 4) {
            HStack(spacing: 6) {
              HomeMark(color: palette.ink)
              Text(active.routineName)
                .font(.caption.weight(.semibold))
                .foregroundStyle(palette.muted)
                .lineLimit(1)
            }
            activeFigure(active, rest: rest, labels: labels, size: large ? 40 : 30)
            if !large {
              upNext(active, labels: labels, lines: 2)
            }
          }
          .frame(maxWidth: .infinity, alignment: .leading)
        }
        if large {
          VStack(alignment: .leading, spacing: 8) {
            upNext(active, labels: labels, lines: 3)
            if rest != nil {
              HStack(spacing: 6) {
                Image(systemName: "stopwatch")
                WorkoutClock(active: active)
              }
              .font(.subheadline.weight(.semibold))
              .foregroundStyle(palette.muted)
            }
          }
          .padding(14)
          .frame(maxWidth: .infinity, alignment: .leading)
          .background(palette.raised, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
        }
      }
      .frame(maxWidth: .infinity, maxHeight: .infinity)
      .widgetURL(activeURL)
    }
  }

  /// The rest countdown during a rest, the clock otherwise (0041 FR-6).
  @ViewBuilder
  private func activeFigure(_ active: HomeSnapshot.Active, rest: Date?, labels: HomeSnapshot.Labels, size: CGFloat) -> some View {
    if let rest {
      VStack(spacing: 0) {
        RestCountdown(endsAt: rest, now: entry.date)
          .font(.system(size: size, weight: .bold))
          .foregroundStyle(palette.accent)
          .lineLimit(1)
          .minimumScaleFactor(0.6)
        Text(labels.rest ?? "")
          .font(.caption2.weight(.semibold))
          .foregroundStyle(palette.accent)
      }
    } else {
      VStack(spacing: 0) {
        WorkoutClock(active: active)
          .font(.system(size: size, weight: .bold))
          .foregroundStyle(palette.text)
          .lineLimit(1)
          .minimumScaleFactor(0.6)
        if active.pausedAtMs != nil {
          Text(labels.paused)
            .font(.caption2.weight(.semibold))
            .foregroundStyle(palette.accent)
        }
      }
    }
  }

  @ViewBuilder
  private func upNext(_ active: HomeSnapshot.Active, labels: HomeSnapshot.Labels, lines: Int) -> some View {
    if let next = active.upNext {
      (Text("\(labels.next ?? "Next"): ").foregroundStyle(palette.ink).bold()
        + Text(next).foregroundStyle(palette.text))
        .font(.subheadline)
        .lineLimit(lines)
    } else if active.setsTotal != nil {
      Text(labels.allDone ?? "")
        .font(.subheadline.weight(.semibold))
        .foregroundStyle(palette.ink)
    }
  }

  // MARK: Week and today's routine

  @ViewBuilder
  private func weekView(_ history: HomeSnapshot.History, labels: HomeSnapshot.Labels) -> some View {
    let figures = WeekFigures(history: history, at: entry.date)
    switch family {
    case .accessoryInline:
      Label("\(figures.streak) · \(figures.daysTrained)/7", systemImage: "flame.fill")
        .widgetURL(routinesURL)
    case .accessoryCircular:
      VStack(spacing: 0) {
        Image(systemName: "flame.fill").font(.system(size: 11))
        Text("\(figures.streak)").font(.system(size: 20, weight: .bold))
      }
      .widgetURL(routinesURL)
    case .accessoryRectangular:
      VStack(alignment: .leading, spacing: 3) {
        DayDots(figures: figures, labels: [], palette: palette, dotSize: 7, spacing: 5)
        Text("\(figures.sets) \(labels.setsThisWeek)")
          .font(.caption.weight(.semibold))
          .lineLimit(1)
      }
      .widgetURL(routinesURL)
    case .systemSmall:
      VStack(spacing: 8) {
        todayTitle(history, labels: labels, centred: true, nameSize: 17)
        DayDots(figures: figures, labels: [], palette: palette, dotSize: 8, spacing: 4)
        streakAndSets(figures, labels: labels, compact: true)
      }
      .frame(maxWidth: .infinity, maxHeight: .infinity)
      .widgetURL(routinesURL)
    default:
      let large = family == .systemLarge
      VStack(spacing: large ? 14 : 0) {
        HStack(alignment: .center, spacing: 14) {
          VStack(alignment: .leading, spacing: 6) {
            todayTitle(history, labels: labels, centred: false, nameSize: large ? 22 : 18)
            startButton(history, labels: labels)
          }
          .frame(maxWidth: .infinity, alignment: .leading)

          VStack(spacing: 8) {
            DayDots(figures: figures, labels: labels.weekdays, palette: palette, dotSize: 9, spacing: 4)
            streakAndSets(figures, labels: labels, compact: false)
          }
          .fixedSize()
        }
        if large {
          exerciseList(history, labels: labels)
        }
      }
      .frame(maxWidth: .infinity, maxHeight: .infinity)
      .widgetURL(routinesURL)
    }
  }

  /// "TODAY" and the routine's name, with its exercises and last time (FR-3, FR-4).
  @ViewBuilder
  private func todayTitle(_ history: HomeSnapshot.History, labels: HomeSnapshot.Labels, centred: Bool, nameSize: CGFloat) -> some View {
    let alignment: HorizontalAlignment = centred ? .center : .leading
    VStack(alignment: alignment, spacing: 2) {
      Text((labels.today ?? "").uppercased())
        .font(.caption2.weight(.bold))
        .foregroundStyle(palette.ink)
        .tracking(0.6)
      if let today = history.today {
        Text(today.name)
          .font(.system(size: nameSize, weight: .bold))
          .foregroundStyle(palette.text)
          .lineLimit(2)
          .multilineTextAlignment(centred ? .center : .leading)
          .minimumScaleFactor(0.8)
        if !centred {
          Text(todayMeta(today, labels: labels))
            .font(.caption)
            .foregroundStyle(palette.muted)
            .lineLimit(1)
        }
      } else {
        Text(history.hasRoutines ? (labels.noRoutine ?? "") : labels.createRoutine)
          .font(.subheadline.weight(.semibold))
          .foregroundStyle(palette.text)
          .multilineTextAlignment(centred ? .center : .leading)
      }
    }
  }

  /// "6 exercises · 6 days ago", or "6 exercises · First time".
  private func todayMeta(_ today: HomeSnapshot.Today, labels: HomeSnapshot.Labels) -> String {
    var parts: [String] = []
    if let count = labels.exerciseCount, today.exercises != nil {
      parts.append(count)
    }
    if let ms = today.lastDoneMs {
      // "6 days ago" / "hace 6 días": short enough for the medium size.
      parts.append(Date(epochMs: ms).formatted(.relative(presentation: .named)))
    } else if let first = labels.firstTime {
      parts.append(first)
    }
    return parts.joined(separator: " · ")
  }

  @ViewBuilder
  private func startButton(_ history: HomeSnapshot.History, labels: HomeSnapshot.Labels) -> some View {
    if let today = history.today, !labels.start.isEmpty {
      Link(destination: startURL(today.id)) {
        Label(labels.start, systemImage: "play.fill")
          .font(.subheadline.weight(.bold))
          .lineLimit(1)
          .minimumScaleFactor(0.8)
          .foregroundStyle(palette.onLime)
          .padding(.horizontal, 12)
          .frame(minHeight: 32)
          .background(palette.lime, in: Capsule())
      }
    } else if !history.hasRoutines {
      Link(destination: createURL) {
        Label(labels.createRoutine, systemImage: "plus")
          .font(.subheadline.weight(.bold))
          .foregroundStyle(palette.text)
          .padding(.horizontal, 12)
          .frame(minHeight: 32)
          .background(palette.raised, in: Capsule())
      }
    }
  }

  /// The streak and the week's work, centred under the dots.
  @ViewBuilder
  private func streakAndSets(_ figures: WeekFigures, labels: HomeSnapshot.Labels, compact: Bool) -> some View {
    if compact {
      HStack(spacing: 10) {
        Label("\(figures.streak)", systemImage: "flame.fill")
          .foregroundStyle(palette.ink)
        Label("\(figures.sets)", systemImage: "square.stack.3d.up.fill")
          .foregroundStyle(palette.text)
      }
      .font(.footnote.weight(.bold).monospacedDigit())
      .labelStyle(.titleAndIcon)
    } else {
      HStack(spacing: 14) {
        figure("\(figures.streak)", labels.streak, icon: "flame.fill", color: palette.ink)
        figure("\(figures.sets)", labels.sets ?? labels.setsThisWeek, icon: nil, color: palette.text)
      }
    }
  }

  private func figure(_ value: String, _ label: String, icon: String?, color: Color) -> some View {
    VStack(spacing: 0) {
      HStack(spacing: 3) {
        if let icon {
          Image(systemName: icon).font(.system(size: 13, weight: .bold))
        }
        Text(value).font(.system(size: 22, weight: .bold)).monospacedDigit()
      }
      .foregroundStyle(color)
      Text(label)
        .font(.caption2)
        .foregroundStyle(palette.muted)
        .lineLimit(1)
    }
  }

  /// Today's routine's exercises, up to six (FR-5).
  @ViewBuilder
  private func exerciseList(_ history: HomeSnapshot.History, labels: HomeSnapshot.Labels) -> some View {
    let exercises = history.today?.exercises ?? []
    if !exercises.isEmpty {
      VStack(alignment: .leading, spacing: 7) {
        ForEach(Array(exercises.prefix(6).enumerated()), id: \.offset) { index, name in
          HStack(spacing: 10) {
            Text("\(index + 1)")
              .font(.caption.weight(.bold).monospacedDigit())
              .foregroundStyle(palette.ink)
              .frame(width: 20, height: 20)
              .background(palette.raised, in: Circle())
            Text(name)
              .font(.subheadline)
              .foregroundStyle(palette.text)
              .lineLimit(1)
            Spacer(minLength: 0)
          }
        }
        if exercises.count > 6, let more = labels.more {
          Text(more.replacingOccurrences(of: "#", with: "\(exercises.count - 6)"))
            .font(.caption)
            .foregroundStyle(palette.muted)
            .padding(.leading, 30)
        }
      }
      .padding(14)
      .frame(maxWidth: .infinity, alignment: .leading)
      .background(palette.raised.opacity(0.6), in: RoundedRectangle(cornerRadius: 16, style: .continuous))
    }
  }
}
