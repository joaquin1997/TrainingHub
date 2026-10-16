---
spec: 0012
status: in-progress  # self-approved 2026-10-16 under the owner's delegation
created: 2026-09-24
---

# Tasks — Live workout status (iOS Live Activity)

Each task leaves the tree green (`pnpm -r typecheck` and `pnpm -r test`).
Native code is taken from the spike branch (`spike/live-activity`) and cleaned
up; the spike's debug panel is not carried over.

## Task list

| # | Task | Area | Verify | Commit message |
|---|---|---|---|---|
| 1 | [x] Spec, plan (with spike results) and tasks; glossary (active energy, live status); backlog | docs | links resolve | `docs(sdd): spec 0012 live workout status` |
| 2 | [x] apple-targets plugin, `appleTeamId`, `NSSupportsLiveActivities`, widget extension + `_shared`, `workout-live-activity` module, Swift-copies test | ios | Swift-copies test (CI); **[DEVICE]** builds, installs | `feat(ios): workout Live Activity extension and module` |
| 3 | [x] Extend `LiveWorkoutBridge` / `HealthWorkoutPayload` in domain; `appleHealthLiveWorkoutBridge` becomes the adapter over the module; Android stays no-op; pure `reconcile` | domain / mobile | unit tests | `feat(workouts): Live Activity behind LiveWorkoutBridge` |
| 4 | [x] Controller subscribed to the draft store, mounted after hydration; remove the per-change `notifyAppleWorkoutStarted` effect and the notify helpers | mobile | unit tests (fakes); **[DEVICE]** start, pause in app and on lock screen, finish, discard, kill + relaunch | `feat(workouts): drive the Live Activity from the active workout` |
| 5 | [x] Finish from the status: `action=finish` → confirm → finish (no set done → existing notice); open the workout after sign-in (EF-7) | mobile | unit test (action parsing); **[DEVICE]** EF-6, EF-7 | `feat(workouts): confirm finishing from the Live Activity` |
| 6 | [x] HealthKit entitlement + usage string, `health-energy` module (`null` for no data/permission, reject on error), `readActiveEnergyKcal` in domain, Apple impl, Android `null` | health | typecheck; **[DEVICE]** permission prompt, kcal vs Fitness | `feat(health): read active energy from Apple Health` |
| 7 | [x] kcal refresh (start, app active, every 60 s in foreground unless paused; keep last value on error) and permission request | mobile | unit tests (fake clock); **[DEVICE]** AC-5, AC-6, EF-5 | `feat(workouts): show active calories on the Live Activity` |
| 8 | README native builds (targets/, modules/, when to `prebuild --clean`); roadmap; backlog; spec status | docs | links resolve | `docs(sdd): close spec 0012` |

Tasks 2, 4–7 need a device rebuild; they are not verifiable in CI.

## Progress log

- 2026-09-24 — Spike on `spike/live-activity` (e2b0d74): signing with the free
  team incl. HealthKit, rendering, and intents reaching JS verified on device.
  Open: Face ID on locked-phone pause; HealthKit read not yet exercised.
- 2026-09-24 — Amended after review: reuse `LiveWorkoutBridge` instead of a new
  interface, remove the per-change notify effect, HealthKit errors vs no data,
  EF-6…EF-8.
- 2026-10-16 — Tasks self-approved under the owner's delegation. Decisions:
  the activity is keyed by the workout's `clientId` (spec 0014) — the draft
  `id` repeats per routine; on reconcile a pause state that differs from the
  draft is adopted from the activity, because every in-app change is pushed at
  once, so a difference can only come from a lock-screen action the JS side
  missed (EF-4); after sign-in with a workout in progress the app opens
  Routines with the workout pushed on top, so Back works (EF-7).
- 2026-10-16 — Task 2: `@bacons/apple-targets` 5.0.0 (dev), `appleTeamId`,
  `NSSupportsLiveActivities`, plugin; widget target and `_shared` (attributes +
  Pause/Resume intents) and the `workout-live-activity` module carried over
  from the spike unchanged. The Swift-copies check is a plain-JS Vitest file
  next to the module (`attributes.test.mjs`; the mobile tsconfig has no Node
  types). `expo config --type prebuild` evaluates the plugin. Device build
  pending.
- 2026-10-16 — Task 3: `HealthWorkoutPayload` gains routine name, pause and
  kcal; `LiveWorkoutState`; optional `getLiveWorkoutState` /
  `onLiveWorkoutStateChange` on `LiveWorkoutBridge` (Android stub untouched).
  `appleHealthLiveWorkoutBridge` adapts the module (only when Live Activities
  are enabled, EF-1; labels set from the app language). Pure
  `toLiveWorkoutPayload` and `reconcile` (none/end/start/adoptPause, 2 s
  tolerance for fractional vs whole seconds); 8 tests. `readActiveEnergyKcal`
  moved to task 6 with its implementation rather than landing as a stub.
- 2026-10-16 — Task 4: `startLiveWorkoutController` (store → bridge: start on a
  new workout identity, update only on pause changes, finish on clear; adopts
  surface pauses without echoing them; reconcile on mount and on app active;
  one ordered queue; a pending-start mark stops the first reconcile from
  starting twice). `useLiveWorkoutController` in `RootNavigator`, enabled once
  signed in and restored; labels from i18n. The per-change
  `notifyAppleWorkoutStarted` effect and both notify helpers are gone. 9 tests
  with a fake bridge. Device checks pending.
- 2026-10-16 — Task 5: `parseWorkoutAction` (2 tests). The active screen, once
  ready, consumes `action=finish` (clears the param), confirms with
  `confirmAction`, then runs the same `finishWorkout` as the button, so EF-6's
  notice comes for free. After sign-in, `RootNavigator` replaces to Routines and
  pushes the active workout when one is in progress (EF-7); the Finish request
  itself is not replayed, per the spec's assumption. Device checks pending.
- 2026-10-16 — Task 6: HealthKit entitlement and usage string; `health-energy`
  module from the spike, changed so no data / denied / not determined resolve
  `null` and any other query error rejects (EF-5). `readActiveEnergyKcal` in
  `HealthIntegration`; Apple reads the module, Android returns `null`.
  `isAvailable` / `requestPermissions` on Apple are now real. Swift not
  compiled here (no Xcode run) — the device build is the check; the HealthKit
  read itself is still the spike's open TODO.
- 2026-10-16 — Task 7: `startActiveEnergyRefresher` — permission asked once at
  the first workout start, a read at start and on app active, every 60 s in
  the foreground unless paused; `null` → unknown, a rejected read keeps the
  last value, a late reading for a previous workout is dropped. Feeds
  `controller.setActiveEnergyKcal`. 4 tests with fake timers. Device checks
  pending (AC-5, AC-6, EF-5).

## Definition of done

- [ ] Every functional requirement and acceptance criterion in `spec.md` is met
      or explicitly deferred with a TODO
- [ ] `pnpm -r typecheck` and `pnpm -r test` green
- [ ] `docs/roadmap/08-integrations-and-platform.md` updated
- [ ] `spec.md` status set to `done`; `../backlog.md` updated
- [ ] Spike branch deleted once everything is carried over
