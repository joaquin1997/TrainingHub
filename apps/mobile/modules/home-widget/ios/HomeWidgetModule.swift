import ExpoModulesCore
import WidgetKit

/// The app's side of the home-screen widget (spec 0036): the snapshot JSON
/// built in JS goes to the App Group the widget extension reads, and the
/// widgets are asked to reload. Without the App Group (a build without
/// `TRAININGHUB_HOME_WIDGET=1`) nothing is written and `false` is returned.
public class HomeWidgetModule: Module {
  /// Must match `HomeWidget.swift` in the widget extension.
  static let appGroup = "group.com.joaquin.traininghub"
  static let key = "homeWidgetSnapshot"

  public func definition() -> ModuleDefinition {
    Name("HomeWidget")

    AsyncFunction("setSnapshot") { (json: String) -> Bool in
      guard let defaults = UserDefaults(suiteName: Self.appGroup),
            FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: Self.appGroup) != nil
      else {
        return false
      }
      defaults.set(json, forKey: Self.key)
      if #available(iOS 14.0, *) {
        WidgetCenter.shared.reloadAllTimelines()
      }
      return true
    }
  }
}
