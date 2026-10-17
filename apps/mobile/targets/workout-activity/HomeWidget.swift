import SwiftUI
import WidgetKit

// The home-screen and lock-screen widget (spec 0036). The app writes a JSON
// snapshot to the App Group (`modules/home-widget`, built in JS by
// `features/homeWidget/snapshot.ts`); the widget only reads it and opens the
// app. Without the App Group nothing arrives and it shows "Open TrainingHub".

private let homeAppGroup = "group.com.joaquin.traininghub"
private let homeSnapshotKey = "homeWidgetSnapshot"

private let lime = Color(red: 0xC8 / 255, green: 0xFF / 255, blue: 0x2E / 255)
private let onLime = Color(red: 0x10 / 255, green: 0x14 / 255, blue: 0x0D / 255)
private let ground = Color(red: 0x15 / 255, green: 0x1A / 255, blue: 0x21 / 255)
private let raised = Color(red: 0x1D / 255, green: 0x25 / 255, blue: 0x30 / 255)
private let muted = Color(red: 0xA7 / 255, green: 0xB0 / 255, blue: 0xBE / 255)
private let accent = Color(red: 0xFF / 255, green: 0x8A / 255, blue: 0x3D / 255)

private let routinesURL = URL(string: "traininghub://routines")!
private let activeURL = URL(string: "traininghub://workouts/active")!
private let createURL = URL(string: "traininghub://routines/create")!

private func startURL(_ routineId: String) -> URL {
  var components = URLComponents(string: "traininghub://routines")!
  components.queryItems = [URLQueryItem(name: "start", value: routineId)]
  return components.url ?? routinesURL
}

struct HomeSnapshot: Codable {
  struct Today: Codable {
    let id: String
    let name: String
  }

  struct History: Codable {
    let weekStartMs: Double
    let days: [Bool]
    let setsThisWeek: Int
    let streak: Int
    let weekHadWorkout: Bool
    let today: Today?
    let hasRoutines: Bool
  }

  struct Active: Codable {
    let routineName: String
    let startedAtMs: Double
    let pausedAtMs: Double?
    let pausedSeconds: Double
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

/// This week's figures as of `date` (FR-14): a new week without the app
/// opened shows an empty week; the streak carries on only through last week.
struct WeekFigures {
  let days: [Bool]
  let sets: Int
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
      streak = history.streak
    case 1:
      days = Array(repeating: false, count: 7)
      sets = 0
      streak = history.weekHadWorkout ? history.streak : 0
    default:
      days = Array(repeating: false, count: 7)
      sets = 0
      streak = 0
    }
  }
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

  /// Now, and each of the next two Mondays at 00:00, so a new week shows
  /// empty without the app being opened (FR-14). The app reloads the rest.
  func getTimeline(in context: Context, completion: @escaping (Timeline<HomeEntry>) -> Void) {
    let snapshot = HomeSnapshot.read()
    var calendar = Calendar(identifier: .gregorian)
    calendar.firstWeekday = 2
    let now = Date()
    var entries = [HomeEntry(date: now, snapshot: snapshot)]
    if let week = calendar.dateInterval(of: .weekOfYear, for: now) {
      entries.append(HomeEntry(date: week.end, snapshot: snapshot))
      if let after = calendar.date(byAdding: .weekOfYear, value: 1, to: week.end) {
        entries.append(HomeEntry(date: after, snapshot: snapshot))
      }
    }
    completion(Timeline(entries: entries, policy: .never))
  }
}

struct HomeWidget: Widget {
  var body: some WidgetConfiguration {
    StaticConfiguration(kind: "TrainingHubHome", provider: HomeProvider()) { entry in
      HomeWidgetView(entry: entry)
        .containerBackground(ground, for: .widget)
    }
    .configurationDisplayName("TrainingHub")
    .description("Your week and the next routine.")
    .supportedFamilies([.systemSmall, .systemMedium, .accessoryCircular, .accessoryRectangular])
  }
}

private struct HomeMark: View {
  var size: CGFloat = 14

  var body: some View {
    ZStack {
      BrandMarkShape()
        .stroke(lime, style: StrokeStyle(lineWidth: max(1.5, size / 8), lineCap: .round, lineJoin: .round))
      BrandMarkDot().fill(lime)
    }
    .frame(width: size, height: size)
    .accessibilityHidden(true)
  }
}

/// Counts up on the system clock; stopped while paused (FR-6).
private struct WorkoutClock: View {
  let active: HomeSnapshot.Active

  var body: some View {
    let start = Date(timeIntervalSince1970: active.startedAtMs / 1000).addingTimeInterval(active.pausedSeconds)
    Text(
      timerInterval: start...start.addingTimeInterval(12 * 3600),
      pauseTime: active.pausedAtMs.map { Date(timeIntervalSince1970: $0 / 1000) },
      countsDown: false
    )
    .monospacedDigit()
  }
}

/// Monday to Sunday: a filled dot for a trained day, a ring otherwise, and
/// today outlined — never colour alone (FR-16, 0034 FR-17).
private struct DayDots: View {
  let figures: WeekFigures
  let labels: [String]
  var dotSize: CGFloat = 10
  var tint: Color = lime

  var body: some View {
    HStack(spacing: 6) {
      ForEach(0..<7, id: \.self) { index in
        VStack(spacing: 3) {
          if labels.count == 7 {
            Text(labels[index])
              .font(.system(size: 10, weight: index == figures.todayIndex ? .bold : .regular))
              .foregroundStyle(index == figures.todayIndex ? tint : muted)
          }
          ZStack {
            if figures.days[safe: index] == true {
              Circle().fill(tint)
            } else {
              Circle().stroke(muted.opacity(0.6), lineWidth: 1.5)
            }
          }
          .frame(width: dotSize, height: dotSize)
          .padding(2)
          .overlay(
            Circle()
              .stroke(index == figures.todayIndex ? tint : .clear, lineWidth: 1)
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

struct HomeWidgetView: View {
  let entry: HomeEntry
  @Environment(\.widgetFamily) private var family

  var body: some View {
    if let snapshot = entry.snapshot {
      if !snapshot.signedIn {
        message(snapshot.labels.signIn)
      } else if let active = snapshot.active {
        activeView(active, labels: snapshot.labels)
      } else if let history = snapshot.history {
        weekView(history, labels: snapshot.labels, date: entry.date)
      } else {
        message(snapshot.labels.openApp)
      }
    } else {
      // No data yet (EF-10): never placeholder figures.
      message("TrainingHub")
    }
  }

  @ViewBuilder
  private func message(_ text: String) -> some View {
    switch family {
    case .accessoryCircular:
      HomeMark(size: 20).widgetURL(routinesURL)
    case .accessoryRectangular:
      Label(text, systemImage: "waveform.path.ecg").widgetURL(routinesURL)
    default:
      VStack(spacing: 8) {
        HomeMark(size: 28)
        Text(text)
          .font(.subheadline.weight(.semibold))
          .foregroundStyle(.white)
          .multilineTextAlignment(.center)
      }
      .widgetURL(routinesURL)
    }
  }

  @ViewBuilder
  private func activeView(_ active: HomeSnapshot.Active, labels: HomeSnapshot.Labels) -> some View {
    switch family {
    case .accessoryCircular:
      // No routine name on the lock screen (FR-12).
      WorkoutClock(active: active)
        .font(.system(size: 12, weight: .semibold))
        .multilineTextAlignment(.center)
        .widgetURL(activeURL)
    case .accessoryRectangular:
      VStack(alignment: .leading) {
        Image(systemName: active.pausedAtMs == nil ? "figure.strengthtraining.traditional" : "pause.fill")
        WorkoutClock(active: active).font(.title3.weight(.semibold))
      }
      .widgetURL(activeURL)
    default:
      VStack(alignment: .leading, spacing: 6) {
        HStack(spacing: 6) {
          HomeMark()
          Text(active.routineName)
            .font(.subheadline.weight(.semibold))
            .foregroundStyle(muted)
            .lineLimit(1)
        }
        Spacer(minLength: 0)
        WorkoutClock(active: active)
          .font(.system(size: family == .systemSmall ? 30 : 40, weight: .bold))
          .foregroundStyle(.white)
          .minimumScaleFactor(0.6)
          .lineLimit(1)
        if active.pausedAtMs != nil {
          Text(labels.paused)
            .font(.caption.weight(.semibold))
            .foregroundStyle(accent)
        }
      }
      .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
      .widgetURL(activeURL)
    }
  }

  @ViewBuilder
  private func weekView(_ history: HomeSnapshot.History, labels: HomeSnapshot.Labels, date: Date) -> some View {
    let figures = WeekFigures(history: history, at: date)
    switch family {
    case .accessoryCircular:
      VStack(spacing: 0) {
        Image(systemName: "flame.fill").font(.system(size: 11))
        Text("\(figures.streak)").font(.system(size: 20, weight: .bold))
      }
      .widgetURL(routinesURL)
    case .accessoryRectangular:
      VStack(alignment: .leading, spacing: 2) {
        DayDots(figures: figures, labels: [], dotSize: 7, tint: .primary)
        Text("\(figures.sets) \(labels.setsThisWeek)")
          .font(.caption.weight(.semibold))
          .lineLimit(1)
      }
      .widgetURL(routinesURL)
    case .systemSmall:
      VStack(alignment: .leading, spacing: 4) {
        HomeMark()
        Spacer(minLength: 0)
        figure("\(figures.streak)", labels.streak, icon: "flame.fill", color: lime)
        figure("\(figures.sets)", labels.setsThisWeek, icon: nil, color: .white)
      }
      .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
      .widgetURL(routinesURL)
    default:
      VStack(alignment: .leading, spacing: 10) {
        HStack(alignment: .top) {
          figure("\(figures.streak)", labels.streak, icon: "flame.fill", color: lime)
          Spacer()
          figure("\(figures.sets)", labels.setsThisWeek, icon: nil, color: .white)
        }
        DayDots(figures: figures, labels: labels.weekdays)
        if let today = history.today, !labels.start.isEmpty {
          Link(destination: startURL(today.id)) {
            Label(labels.start, systemImage: "play.fill")
              .font(.subheadline.weight(.bold))
              .lineLimit(1)
              .foregroundStyle(onLime)
              .frame(maxWidth: .infinity, minHeight: 32)
              .background(lime, in: Capsule())
          }
        } else if !history.hasRoutines {
          Link(destination: createURL) {
            Label(labels.createRoutine, systemImage: "plus")
              .font(.subheadline.weight(.bold))
              .foregroundStyle(.white)
              .frame(maxWidth: .infinity, minHeight: 32)
              .background(raised, in: Capsule())
          }
        }
      }
      .widgetURL(routinesURL)
    }
  }

  private func figure(_ value: String, _ label: String, icon: String?, color: Color) -> some View {
    VStack(alignment: .leading, spacing: 0) {
      HStack(spacing: 4) {
        if let icon {
          Image(systemName: icon).font(.system(size: 14, weight: .bold))
        }
        Text(value).font(.system(size: 26, weight: .bold)).monospacedDigit()
      }
      .foregroundStyle(color)
      Text(label)
        .font(.caption2)
        .foregroundStyle(muted)
        .lineLimit(1)
    }
  }
}
