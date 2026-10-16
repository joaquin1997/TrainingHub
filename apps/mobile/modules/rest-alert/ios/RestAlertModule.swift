import ExpoModulesCore
import UserNotifications

/// The alert at the end of a rest (spec 0018 FR-6). A local notification: it
/// needs no entitlement, and iOS forwards it to a paired watch while the phone
/// is locked or asleep. There is only one, under a fixed identifier, so
/// scheduling again replaces it and it can never fire twice.
public class RestAlertModule: Module {
  private let identifier = "rest-timer"

  public func definition() -> ModuleDefinition {
    Name("RestAlert")

    // iOS asks the person only the first time; later calls return the answer.
    AsyncFunction("requestPermission") { (promise: Promise) in
      UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound]) {
        granted, _ in
        promise.resolve(granted)
      }
    }

    AsyncFunction("schedule") { (atMs: Double, title: String, body: String, promise: Promise) in
      let center = UNUserNotificationCenter.current()
      center.removePendingNotificationRequests(withIdentifiers: [self.identifier])
      center.removeDeliveredNotifications(withIdentifiers: [self.identifier])

      let content = UNMutableNotificationContent()
      content.title = title
      content.body = body
      content.sound = .default

      // The trigger needs a positive interval; a rest due now fires in 1 s.
      let seconds = max(1, atMs / 1000 - Date().timeIntervalSince1970)
      let trigger = UNTimeIntervalNotificationTrigger(timeInterval: seconds, repeats: false)
      let request = UNNotificationRequest(
        identifier: self.identifier, content: content, trigger: trigger)

      // Without permission this delivers nothing; that is not an error (EF-1).
      center.add(request) { _ in
        promise.resolve(nil)
      }
    }

    AsyncFunction("cancel") { (promise: Promise) in
      let center = UNUserNotificationCenter.current()
      center.removePendingNotificationRequests(withIdentifiers: [self.identifier])
      center.removeDeliveredNotifications(withIdentifiers: [self.identifier])
      promise.resolve(nil)
    }
  }
}
