---
spec: 0045
status: approved     # self-approved under the delegated gates, 2026-11-03
created: 2026-11-03
---

# Plan — The watch keeps going with the phone locked

## Current state (verified 2026-11-03, branch `feat/sdd-0040-device-fixes`)

- **Transport (spec 0025).** Phone → watch: `WCSession.updateApplicationContext`
  `["context": json]` from `PhoneWatchLink.sendContext`
  (`modules/watch-workout/ios/PhoneWatchLink.swift`). Watch → phone:
  `transferUserInfo(["event": json])` for set done / pause / resume / finish
  (`WorkoutModel.send`), `sendMessage` for discard (0035), the watch's
  application context for kcal.
- **Why it fails.** The iOS app declares no `UIBackgroundModes`
  (`app.json`, `ios/TrainingHub/Info.plist`), so it is suspended seconds
  after the phone locks. `transferUserInfo` does not wake a suspended iOS app;
  the event waits in the system queue until the app runs, and the phone's JS
  (`watchWorkoutController.handleEvent` → `applyWatchEvent`) is the only place
  that works out the next set. Confirmed by the owner on the device
  (2026-11-03).
- **What the watch shows meanwhile.** `tickCurrentSet` sets `tickedSetId`;
  `currentSet` hides that set, and `WorkoutView.currentSet` renders nothing
  while `tickedSetId != nil` — a blank area until the next context. The local
  rest counts down.
- **Dedupe.** The phone drops a repeated event by id (`firstTime`, last 200
  ids) for every kind but kcal. The watch drops a context only when an older
  one (`sentAtMs` strictly smaller) arrives for the same workout; an identical
  copy is applied again and resets `tickedSetId` / `localRestEndsAt`.
- **Phone launch.** `AppDelegate` is an `ExpoAppDelegate`; React Native is
  started by `SceneDelegate` when a scene connects. The module's `OnCreate`
  (JS load) sets `onMessage` and activates `WCSession`; messages that arrive
  before JS listens are buffered in the module.
- **Auth at launch.** `AuthContext` reads the token from SecureStore
  (default accessibility *when unlocked*). A read failure is swallowed and
  the app starts signed out (`isLoading` false, no user) — the token is not
  cleared. The live/watch controllers run only when signed in and the stored
  workout is restored (`_layout.tsx`: `isAuthenticated && !isRestoringWorkout`).
- **HealthKit on the phone.** The phone app has the HealthKit entitlement and
  reads active energy. Workout share/read permission is asked by the watch
  app, which belongs to the same app.
- **Expo support.** Local modules can register an `ExpoAppDelegateSubscriber`
  through `apple.appDelegateSubscribers` in `expo-module.config.json`
  (autolinking 58; `expo-linking` does it), which runs in
  `didFinishLaunching` before React Native starts.

## Constitution check

| Article | Engaged? | Compliance |
|---|---|---|
| 1 — Scope control | yes | Keeps the phone app alive only while a watch workout runs, adds a faster path for the same messages, a waiting line on the watch, and a retry of the token read. No new logic on the watch about what comes next (spec out of scope); no change to discard (0035 EF-8). |
| 2 — Template vs performed | no | Same performed-set ticks as 0025. |
| 3 — Shared domain types | no | No contract changes. One new optional label (`waitingPhone`) on the private iOS wire shared by `appleWatchWire.ts` and `WatchWire.swift`, guarded by `wire.test.mjs`. |
| 4 — Weight in kg | no | No weight crosses the new path; the context is the same JSON. |
| 5 — Prisma migrations | no | |
| 6 — Integrations behind interfaces | yes | All HealthKit mirroring lives in the `watch-workout` module and the watch target; `WatchWorkoutBridge` is unchanged and feature code does not see it. |
| 7 — Secrets | no | |
| 8 — Committable + verified | yes | Each task builds on its own; JS changes are unit-tested; Swift is compiled by the iOS/watch build; device-only checks are tagged [DEVICE] and not ticked as verified. |
| 9 — Dependencies | yes | No new package. Apple frameworks only (HealthKit already linked). **Native rebuild required**, with `expo prebuild` (new `UIBackgroundModes` and a new AppDelegate subscriber) — `scripts/deploy-pending.sh`, not `renew-iphone.sh`. |
| 10 — TODOs over half-solutions | yes | System behaviours only a device can show (background launch after force-quit, keep-alive, latency) are under Risks as `TODO(sdd)`; the queue stays as the fallback, so none of them can lose a tick. |

## Approach

**HealthKit workout mirroring keeps the phone app running; the existing
WatchConnectivity queue stays as the safety net.**

1. **Watch mirrors its session.** After `beginCollection` succeeds,
   `WorkoutModel.ensureSession` calls
   `session.startMirroringToCompanionDevice()` (watchOS 10+; the target is
   11). A failure is ignored: everything works as today.
2. **Phone takes the mirrored session at launch.** A new
   `WatchWorkoutAppDelegate: ExpoAppDelegateSubscriber` in the module sets
   `HKHealthStore.workoutSessionMirroringStartHandler` (iOS 17+, guarded with
   `#available`) in `didFinishLaunching`, through
   `PhoneWatchLink.shared.installMirroringHandler()`. The handler keeps the
   `HKWorkoutSession` it receives and becomes its delegate. With
   `UIBackgroundModes: ["workout-processing"]` the system keeps the iPhone app
   running in the background while the mirrored session is active (FR-1),
   and launches it in the background if it is not running (EF-2).
3. **Same messages, faster path.** While the mirrored session is connected:
   - watch → phone: `WorkoutModel.send` sends the event JSON with
     `sendToRemoteWorkoutSession(data:)` **and** still `transferUserInfo`
     (queued, EF-1). The phone's delegate
     (`didReceiveDataFromRemoteWorkoutSession`) delivers it as an `event`;
     the second copy is dropped by the existing id dedupe (EF-3).
   - phone → watch: `PhoneWatchLink.sendContext` also sends
     `["context": json]` over the mirrored session; the watch's
     `HKWorkoutSessionDelegate` receives it and calls `apply(contextJSON:)`.
     `apply` now also ignores a context **identical** to the last one applied
     (both paths deliver the same JSON), so a late duplicate cannot reset a
     tick made in between.
   - The payload is the same dictionary as today, serialised with
     `JSONSerialization` (`["event": json]` / `["context": json]`).
   Discard keeps its live-only `sendMessage` (0035 EF-8); kcal keep the
   watch's application context — neither changes.
4. **The phone app works as in the foreground.** With the app running, the
   tick reaches the JS controller, which applies it and, through the existing
   controllers, starts the rest alert (0018), updates the live workout
   status (0012) and sends the next context (FR-2, FR-3). No JS change for
   this.
5. **Kept alive only during a watch workout (FR-5, EF-4).** The watch ends
   its session on finished/discarded (0025); the phone's delegate drops its
   reference when the mirrored session ends, fails or disconnects
   (`didChangeTo .ended/.stopped`, `didFailWithError`,
   `didDisconnectFromRemoteDeviceWithError`). After that the app is an
   ordinary background app again.
6. **Waiting line on the watch (FR-4).** `tickCurrentSet` arms a 5 s timer;
   when it fires with the ticked set still pending (no newer context),
   `WorkoutModel.waitingForPhone = true`. `apply(contextJSON:)` clears it.
   `WorkoutView` shows `labels.waitingPhone` (new optional label, fallback
   "Waiting for your iPhone…") in place of the set while it is true.
7. **Token read retried (EF-2).** If iOS ever starts the JS while the phone
   is locked, the SecureStore read fails and the app starts signed out —
   opening it later would show the sign-in screen. `AuthContext` remembers a
   *failed* read (not an empty one) and reads again when the app next becomes
   active; a success then validates the session as at launch. Pure decision
   extracted to a helper and unit-tested. The token is never cleared by a
   read failure (already true).

### Alternatives considered

- **Mirroring only as a keep-alive, no data over it** — simpler, but
  WatchConnectivity background transfers are delivered at the system's pace;
  AC-1 asks for 5 s. The extra path is a few lines on each side and reuses
  the same JSON and dedupe. Rejected.
- **Move all traffic to the mirrored session, drop WatchConnectivity** —
  rejected: the mirrored session is not queued when contact is lost (EF-1),
  does not exist before the watch's session starts (labels, first context),
  and a cold background launch may receive data before JS listens.
- **`sendMessage` from the watch for ticks** — wakes the iPhone app briefly,
  but gives no guarantee it stays awake for the reply and the next tick;
  fails when not reachable. Rejected in 0025, still rejected.
- **The watch works out the next set itself** — out of scope in the spec
  (duplicates the workout rules).
- **SecureStore readable after first unlock** — would let a background launch
  read the token while locked, but weakens the token's protection and needs
  a migration of the stored item. The retry on activation covers the case
  without that. Rejected.

## Shared contracts (`packages/domain`)

None.

## Data model and migrations

None.

- Backfill / data migration needed: no.

## API surface (`apps/api`)

None.

## Mobile surface (`apps/mobile`)

- **Native (phone):** `UIBackgroundModes: ["workout-processing"]` in
  `app.json` → prebuild; AppDelegate subscriber + mirrored session in the
  `watch-workout` module. **Native rebuild and prebuild required.**
- **Native (watch):** mirroring, the data delegate, identical-context dedupe,
  the waiting state and label.
- **JS:** one label (`waitingPhone`) in `appleWatchWire.ts` /
  `appleWatch.ts` fallbacks / `useLiveWorkoutController.setWatchLabels`, the
  i18n strings (es/en), and the token-read retry in `AuthContext`.

## Testing strategy

| Spec AC | Verified by |
|---|---|
| AC-1 | [DEVICE] phone locked in a pocket, tick on the watch, next set within 5 s |
| AC-2 | [DEVICE] lock screen shows the rest from the watch; buzz at rest end (once or twice — recorded for the owner's call) |
| AC-3 | [DEVICE] whole routine from the watch with the phone locked; unlock; every set done with its reps |
| AC-4 | [DEVICE] phone switched off → waiting line on the watch; phone back, app opened → tick applied once. Unit: phone dedupe already tested in `watchWorkoutController.test.ts` |
| AC-5 | [DEVICE] after finishing, Settings → Battery shows no background activity for the app for the following time |
| AC-6 | [DEVICE] Pause on the watch with the phone locked; unlock → paused from that instant |
| AC-7 | [DEVICE] workout without the watch app: unchanged; unit tests unchanged |

Unit-tested: the label wire (`wire.test.mjs`, `appleWatchWire.test.ts`), the
token-read retry decision. Compiled: phone module and watch target in the
Release build.

## Files to touch

- `apps/mobile/app.json` — `ios.infoPlist.UIBackgroundModes: ["workout-processing"]`.
- `apps/mobile/modules/watch-workout/expo-module.config.json` — `appDelegateSubscribers: ["WatchWorkoutAppDelegate"]`.
- `apps/mobile/modules/watch-workout/ios/WatchWorkoutAppDelegate.swift` — new: installs the mirroring handler at launch.
- `apps/mobile/modules/watch-workout/ios/PhoneWatchLink.swift` — mirrored session: handler, `HKWorkoutSessionDelegate`, receive events, send context, release on end.
- `apps/mobile/targets/watch/WorkoutModel.swift` — start mirroring, send events over it, receive contexts, identical-context dedupe, waiting timer/state.
- `apps/mobile/targets/watch/WorkoutView.swift` — the waiting line.
- `apps/mobile/targets/watch/WatchWire.swift` — optional `waitingPhone` label + fallback.
- `apps/mobile/src/features/health/providers/appleWatchWire.ts`, `appleWatch.ts` (+ tests), `modules/watch-workout/wire.test.mjs` — the label.
- `apps/mobile/src/features/workouts/liveActivity/useLiveWorkoutController.ts` — pass the label.
- `apps/mobile/src/i18n/locales/es.ts`, `en.ts` — `watchWaitingPhone`.
- `apps/mobile/src/features/auth/AuthContext.tsx` (+ helper and test) — retry a failed token read when the app becomes active.
- `docs/sdd/specs/0045-…/tasks.md`, `docs/sdd/backlog.md`, `docs/roadmap/08-integrations-and-platform.md` — status.

## Risks and open questions

- **Keep-alive is the system's call.** Apple documents that the companion app
  runs in the background while a mirrored session is active, given the
  workout-processing background mode. `TODO(sdd): confirm on the device that
  the app keeps applying ticks for a whole workout with the phone locked —
  AC-1/AC-3.`
- **Background launch.** Whether the system relaunches an app that was
  swiped away, and whether React Native starts without a connected scene, is
  not documented clearly. Either way the queued copy of every tick survives
  and is applied when the app opens (EF-2). `TODO(sdd): note on the device
  what happens after swiping the app away mid-workout.`
- **Latency of the mirrored data path** — expected well under a second;
  `TODO(sdd): measure on the device (AC-1).`
- **Double buzz at rest end** — kept on purpose (spec, owner 2026-11-03);
  more likely now, since the phone schedules its rest alert for watch ticks.
- **Health permission for mirroring** — the phone does not ask for workout
  permission itself; the watch app's grant covers the app.
  `TODO(sdd): if the mirroring handler never fires on the device, request
  workout share permission on the phone before starting the watch app.`
- **Older phones** — iOS < 17 never gets the handler: today's behaviour.

## Rollout

- No API change, no migration. App only.
- Needs `expo prebuild` + native build + reinstall on the iPhone and the watch:
  `scripts/deploy-pending.sh` (with `FORCE_IPHONE=1` and `RELEASE=1` if
  wanted) — `renew-iphone.sh` alone does not prebuild.
- Backwards compatible: an old watch app keeps using the queue; an old phone
  app ignores mirrored data (no handler). Roll back by reinstalling the
  previous build.
