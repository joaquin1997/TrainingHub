import ExpoModulesCore
import HealthKit

public class HealthEnergyModule: Module {
  private let store = HKHealthStore()

  public func definition() -> ModuleDefinition {
    Name("HealthEnergy")

    Function("isAvailable") { () -> Bool in
      HKHealthStore.isHealthDataAvailable()
    }

    // Resolves true when the request completed; HealthKit never reveals whether
    // read access was actually granted (a denial just looks like no data).
    AsyncFunction("requestReadAuthorization") { (promise: Promise) in
      guard HKHealthStore.isHealthDataAvailable(),
        let activeEnergy = HKObjectType.quantityType(forIdentifier: .activeEnergyBurned)
      else {
        promise.resolve(false)
        return
      }
      self.store.requestAuthorization(toShare: nil, read: [activeEnergy]) { success, error in
        promise.resolve(success && error == nil)
      }
    }

    // Sum of active energy in kcal between two instants, de-duplicated across
    // iPhone and Apple Watch. Null when there is no data or no permission
    // (HealthKit does not tell them apart). Any other failure — notably the
    // health database being locked while the phone is — rejects, so the
    // caller keeps the last known value (spec 0012 EF-5).
    AsyncFunction("activeEnergyKcal") { (startMs: Double, endMs: Double, promise: Promise) in
      guard HKHealthStore.isHealthDataAvailable(),
        let activeEnergy = HKQuantityType.quantityType(forIdentifier: .activeEnergyBurned)
      else {
        promise.resolve(nil)
        return
      }
      let predicate = HKQuery.predicateForSamples(
        withStart: Date(timeIntervalSince1970: startMs / 1000),
        end: Date(timeIntervalSince1970: endMs / 1000),
        options: []
      )
      let query = HKStatisticsQuery(
        quantityType: activeEnergy,
        quantitySamplePredicate: predicate,
        options: .cumulativeSum
      ) { _, statistics, error in
        if let error = error {
          let unknownNotFailed: [HKError.Code] = [
            .errorNoData, .errorAuthorizationDenied, .errorAuthorizationNotDetermined,
          ]
          if let healthError = error as? HKError,
            unknownNotFailed.contains(healthError.code)
          {
            promise.resolve(nil)
          } else {
            promise.reject("ERR_HEALTH_ENERGY_READ", error.localizedDescription)
          }
          return
        }
        promise.resolve(statistics?.sumQuantity()?.doubleValue(for: .kilocalorie()))
      }
      self.store.execute(query)
    }
  }
}
