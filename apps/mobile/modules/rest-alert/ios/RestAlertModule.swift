import ExpoModulesCore
import UIKit
import UserNotifications

/// The alert at the end of a rest (spec 0018 FR-6). A local notification: it
/// needs no entitlement, and iOS forwards it to a paired watch while the phone
/// is locked or asleep. There is only one, under a fixed identifier, so
/// scheduling again replaces it and it can never fire twice.
public class RestAlertModule: Module {
  static let identifier = "rest-timer"
  private var identifier: String { Self.identifier }

  public func definition() -> ModuleDefinition {
    Name("RestAlert")

    OnCreate {
      RestAlertPresenter.install()
    }

    // iOS asks the person only the first time; later calls return the answer.
    AsyncFunction("requestPermission") { (promise: Promise) in
      UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound]) {
        granted, _ in
        promise.resolve(granted)
      }
    }

    // Whether the system was asked, and the answer (spec 0037 FR-8, FR-14).
    AsyncFunction("permissionStatus") { (promise: Promise) in
      UNUserNotificationCenter.current().getNotificationSettings { settings in
        switch settings.authorizationStatus {
        case .notDetermined:
          promise.resolve("notAsked")
        case .denied:
          promise.resolve("denied")
        default:
          promise.resolve("granted")
        }
      }
    }

    // The app's notification settings, where alerts are turned back on (FR-14).
    AsyncFunction("openSettings") { (promise: Promise) in
      DispatchQueue.main.async {
        let name: String
        if #available(iOS 16.0, *) {
          name = UIApplication.openNotificationSettingsURLString
        } else {
          name = UIApplication.openSettingsURLString
        }
        if let url = URL(string: name) {
          UIApplication.shared.open(url)
        }
        promise.resolve(nil)
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

/// Shows the rest alert also while the app is in front (spec 0040 FR-4): iOS
/// hides a local notification from the open app unless the notification
/// center's delegate asks for it. Any other notification goes to the delegate
/// that was there before, unchanged.
final class RestAlertPresenter: NSObject, UNUserNotificationCenterDelegate {
  private static let shared = RestAlertPresenter()
  private weak var previous: UNUserNotificationCenterDelegate?

  static func install() {
    let center = UNUserNotificationCenter.current()
    guard !(center.delegate is RestAlertPresenter) else { return }
    shared.previous = center.delegate
    center.delegate = shared
  }

  func userNotificationCenter(
    _ center: UNUserNotificationCenter,
    willPresent notification: UNNotification,
    withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void
  ) {
    if notification.request.identifier == RestAlertModule.identifier {
      completionHandler([.banner, .list, .sound])
    } else if let previous,
      previous.responds(
        to: #selector(
          UNUserNotificationCenterDelegate.userNotificationCenter(_:willPresent:withCompletionHandler:)))
    {
      previous.userNotificationCenter?(
        center, willPresent: notification, withCompletionHandler: completionHandler)
    } else {
      completionHandler([])
    }
  }

  func userNotificationCenter(
    _ center: UNUserNotificationCenter,
    didReceive response: UNNotificationResponse,
    withCompletionHandler completionHandler: @escaping () -> Void
  ) {
    if let previous,
      previous.responds(
        to: #selector(
          UNUserNotificationCenterDelegate.userNotificationCenter(_:didReceive:withCompletionHandler:)))
    {
      previous.userNotificationCenter?(
        center, didReceive: response, withCompletionHandler: completionHandler)
    } else {
      completionHandler()
    }
  }
}
