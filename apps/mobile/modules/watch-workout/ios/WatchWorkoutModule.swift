import ExpoModulesCore

public class WatchWorkoutModule: Module {
  private var observing = false
  /// Messages that arrived before JS listened, e.g. requests queued on the
  /// watch while the phone app was closed (spec 0025 EF-1).
  private var buffered: [[String: String]] = []

  public func definition() -> ModuleDefinition {
    Name("WatchWorkout")

    Events("onMessage")

    OnCreate {
      PhoneWatchLink.shared.onMessage = { [weak self] kind, json in
        self?.deliver(["kind": kind, "json": json])
      }
      PhoneWatchLink.shared.activate()
    }

    // `observing` and `buffered` are only touched on the main queue, where the
    // link delivers its messages.
    OnStartObserving {
      DispatchQueue.main.async {
        self.observing = true
        let messages = self.buffered
        self.buffered = []
        messages.forEach { self.sendEvent("onMessage", $0) }
      }
    }

    OnStopObserving {
      DispatchQueue.main.async { self.observing = false }
    }

    Function("isWatchAppInstalled") { () -> Bool in
      PhoneWatchLink.shared.isWatchAppInstalled
    }

    AsyncFunction("startWatchApp") { (promise: Promise) in
      PhoneWatchLink.shared.startWatchApp { started in
        promise.resolve(started)
      }
    }

    AsyncFunction("sendContext") { (json: String) in
      PhoneWatchLink.shared.sendContext(json)
    }
  }

  private func deliver(_ message: [String: String]) {
    if observing {
      sendEvent("onMessage", message)
    } else {
      buffered.append(message)
    }
  }
}
