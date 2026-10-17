---
spec: 0025
status: in-progress  # self-approved under the delegated gates, 2026-10-17
created: 2026-10-17
---

# Tasks — The workout on the Apple Watch

Each task leaves the tree green (`pnpm -r typecheck` and `pnpm -r test`).
Level 1 (tasks 1–2) is a shippable slice on its own. Level 2 (tasks 3–8)
follows in separate commits; its JS reaches native code through
`requireOptionalNativeModule`, so every commit runs on the current build.

## Task list

| # | Task | Area | Verify | Commit message |
|---|---|---|---|---|
| 1 | [x] Plan and tasks; spec → `in-progress` | docs | links resolve | `docs(sdd): plan and tasks for 0025` |
| **L1** | | | | |
| 2 | [x] `supplementalActivityFamilies([.small])` behind `if #available(iOS 18.0, *)`; `FamilyAwareView` → `WatchSmallView` (routine, paused, clock, rest countdown, kcal when known; no buttons) | ios (**native — rebuild**) | `swiftc -typecheck` of the extension at iOS 17.0 against the iOS 26.5 simulator SDK; Swift-copies test unchanged; **[DEVICE]** AC-1 | `feat(ios): the Live Activity on the Apple Watch Smart Stack` |
| **L2** | | | | |
| 3 | [x] `WatchWorkoutSnapshot`, `WatchWorkoutEvent`, `WatchWorkoutBridge` in `packages/domain/src/health.ts` | domain | `pnpm -r typecheck` | `feat(domain): watch workout contract` |
| 4 | [x] `completeSet` in `workoutDraftStore.ts` (done + rest from an instant; no-op when done or unknown) used by `handleToggleDone`; `watch/watchProtocol.ts`: `currentSetToDo`, `toWatchSnapshot`, `parseWatchEvent`, `applyWatchEvent` + tests | mobile | unit tests: tick → done + rest from the tick's instant (AC-3), replay is a no-op (EF-1), events for another workout dropped, unknown/malformed JSON ignored, target text in the session unit (Art. 4), superset order | `feat(workouts): apply watch requests to the active workout` |
| 5 | [x] `watch/watchWorkoutController.ts` (start / update / end finished-or-discarded; events → store; kcal and finish callbacks) + tests with a fake bridge | mobile | controller tests: start once per workout (FR-2), update only on snapshot change, end `finished` vs `discarded`, ordered apply of queued ticks (EF-1), kcal callback only for the current workout | `feat(workouts): mirror the active workout to a watch` |
| 6 | [x] Local module `modules/watch-workout` (WCSession, `startWatchApp`, `sendContext`, buffered `onMessage`); Apple `WatchWorkoutBridge` adapter + labels; `findWatchWorkoutBridge`; wiring in `useLiveWorkoutController` (watch kcal wins, finish request → `action=finish`); i18n en/es | mobile (**native — rebuild**) | typecheck + tests (wire-format and labels); **[DEVICE]** FR-2, FR-3 | `feat(ios): talk to the watch app from the phone` |
| 7 | [x] Watch app target `targets/watch/` (`type: 'watch'`, watchOS 11, HealthKit entitlement, `workout-processing`): HK session + live builder from the phone's start, HR/kcal, context in, events out (queued), Done / rest + haptic / Pause / Resume / Finish request, save on `finished`, discard on `discarded`; wire-format test against the watch's `Codable` keys | watch (**native — rebuild**) | `swiftc -typecheck` against the watchOS 26.5 simulator SDK; wire-format test; `expo config` evaluates the target; **[DEVICE]** FR-2…FR-5, AC-2, AC-3, EF-1, EF-2 | `feat(watch): the workout on the Apple Watch` |
| 8 | [x] README (watch target, install on the watch), progress log, pending device steps | docs | links resolve | `docs(sdd): close spec 0025 implementation` |

**Not verifiable in CI:** tasks 2, 6 and 7 need `expo prebuild` and a device
build; their device checks go in one batch on the owner's iPhone + Apple Watch
Ultra 2.

### Acceptance criteria → tasks

| AC | Task | How |
|---|---|---|
| AC-1 | 2 | Swift type-check + [DEVICE] Smart Stack |
| AC-2 | 5, 6, 7 | kcal-precedence tests + [DEVICE] 45-minute workout vs the watch |
| AC-3 | 4, 5, 7 | `applyWatchEvent` / controller tests + [DEVICE] |

### Requirements → tasks

| Requirement | Task |
|---|---|
| FR-1 | 2 |
| FR-2 | 5, 6, 7 |
| FR-3 | 6, 7 |
| FR-4 | 4, 7 |
| FR-5 | 7 (the phone writes none) |
| EF-1 | 4, 5, 7 |
| EF-2 | 7 |

## Progress log

- 2026-10-17 — Plan and tasks written and self-approved (delegated gates).
- 2026-10-17 — Task 2 (Level 1): the Live Activity declares the small family
  on iOS 18 (`watchSmartStackFamily()`, an opaque result with an
  `if #available` branch, so the extension still deploys to iOS 17.0) and
  renders `WatchSmallView` for it: routine and paused label, the elapsed
  clock, the rest countdown while one runs, calories when known; no buttons.
  The iPhone lock screen and Dynamic Island are unchanged; so are the
  attributes (both copies) and the JS. `swiftc -typecheck` of the extension
  (index, widget, `_shared`) at `arm64-apple-ios17.0-simulator` against the
  iOS 26.5 simulator SDK passes. Device check pending (AC-1).
- 2026-10-17 — Task 3: `WatchWorkoutSnapshot` / `WatchWorkoutSet`,
  `WatchWorkoutEvent`, `WatchWorkoutOutcome` and `WatchWorkoutBridge` in
  `packages/domain/src/health.ts`; nothing uses them yet.
- 2026-10-17 — Task 4: `completeSet` (tick + rest from an instant, no-op for a
  done or unknown set) now backs the screen's tick too. `watch/watchProtocol.ts`:
  `currentSetToDo`, `setTarget`, `toWatchSnapshot`, `sameSnapshot`,
  `applyWatchEvent` (a late tick never replaces a rest that ends later). The
  JSON parsing moved to task 6 with the wire format, which is Apple-specific.
  [ASSUMPTION: with no rest running, the watch offers the next set of the
  first block with a set left — the phone does not record which set was
  ticked last.]
- 2026-10-17 — Task 5: `startWatchWorkoutController` — start on a new workout
  identity, update only when the snapshot changes, end `finished` when
  `getLatestCompletedWorkout()` is that workout, else `discarded`; requests
  applied in arrival order, a repeated id dropped (last 200 kept); kcal and
  Finish passed to callbacks. 7 tests with a fake bridge and store. Not
  mounted yet (task 6).
- 2026-10-17 — Task 6: local module `modules/watch-workout` —
  `PhoneWatchLink.swift` (WCSession: work waits for activation; context out
  as `["context": json]`; user info `event` and the watch's context
  `metrics` in; `HKHealthStore.startWatchApp` with a strength/indoor
  configuration, only when a paired watch has the app) and
  `WatchWorkoutModule.swift` (buffers messages until JS listens).
  `PhoneWatchLink.swift` type-checks against the iOS 26.5 simulator SDK at
  iOS 15.1; the module file needs ExpoModulesCore and is checked by the
  native build. JS: `appleWatchWire.ts` (encode the context, decode events
  and metrics; malformed → ignored; 4 tests), `appleWatch.ts` adapter (sends
  the state before launching the watch app), `findWatchWorkoutBridge`;
  `createKcalSources` (watch figure wins once it arrives; 2 tests); wiring in
  `useLiveWorkoutController` (Settings default rest read through a ref; the
  watch's Finish opens `/workouts/active?action=finish`); i18n en/es
  `workouts.watch*`. Without the native module everything is a no-op.
- 2026-10-17 — Task 7: watch app `targets/watch/` (`type: 'watch'`, watchOS
  11.0, `.watchkitapp`, HealthKit entitlement, `WKApplication`,
  `workout-processing`, Health usage strings): `WatchWire.swift` (Codable
  mirror of the wire), `WorkoutModel.swift` (WCSession in/out; the HealthKit
  session + live builder start from the phone's start instant, once per
  workout, also when the app is opened by hand; pause follows the phone;
  `finished` → end collection + `finishWorkout`, `discarded` → discard;
  Done ticks locally, starts the local rest and queues `setDone`; haptic
  `.stop` at the rest end; kcal sent at most every 10 s; heart rate hidden
  when unknown), `WorkoutView.swift`, `TrainingHubWatchApp.swift`
  (`handle(_ workoutConfiguration:)`). `wire.test.mjs` checks every key both
  ways against `WatchWire.swift`.
  Checks: `swiftc -typecheck` against the watchOS 26.5 simulator SDK at
  watchOS 11.0; after `expo prebuild` the target is generated and embedded
  ("Embed Watch Content", companion id set) and `xcodebuild -target
  TrainingHubWatch -sdk watchsimulator CODE_SIGNING_ALLOWED=NO` succeeds;
  the `WatchWorkout` pod (module + link) builds for the iOS simulator. The
  full scheme with the watch app does **not** build here: "watchOS 26.5 must
  be installed" (the platform component is missing on this Mac, for device
  builds too). Hence the plan amendment: the watch target is opt-in with
  `TRAININGHUB_WATCH_APP=1` (`app.config.js`); without it the full app
  (Level 1 widget, all modules) builds unsigned for the simulator — verified.
- 2026-10-17 — Task 8: `apps/mobile/README.md` (the new module and target,
  the opt-in flag, installing the watchOS platform and the watch app). The
  backlog, roadmap 08 and glossary updates go to the coordinator (parallel
  agents). Spec stays `in-progress`: everything below needs the devices.
- 2026-10-17 — Coordinator: roadmap 08 (Apple Watch app checklist + log) and
  backlog row updated. Glossary not touched in this pass.

### Pending on the owner's devices

Level 1 (normal prebuild + rebuild, no flag):
- [ ] [DEVICE] Workout in progress, phone locked → the watch's Smart Stack
      shows routine, clock, calories (once known) and, during a rest, the
      countdown; it disappears at the rest end (AC-1, FR-1)
- [ ] [DEVICE] The iPhone lock screen and Dynamic Island look as before

Level 2 (`TRAININGHUB_WATCH_APP=1` prebuild, watchOS platform installed):
- [ ] [DEVICE] The watch app signs with HealthKit on the free team and installs
      (TODO in the plan; if not, Level 2 needs a paid team — owner decision)
- [ ] [DEVICE] Start a workout on the phone → the watch app opens into it
      (FR-2); Health permission asked on the watch once
- [ ] [DEVICE] Heart rate and kcal on the watch; the phone shows the watch's
      kcal; 45-minute workout → app vs the watch's figure within ±5 % (AC-2, FR-3)
- [ ] [DEVICE] Done on the watch → done on the phone, rest on both, haptic at
      its end (AC-3, FR-4); count the buzzes with the phone locked (TODO)
- [ ] [DEVICE] Phone in airplane mode / out of range, tick twice, reconnect →
      both applied in order (EF-1); how long it takes with the phone app in the
      background (plan risk: mirroring as the fallback)
- [ ] [DEVICE] Pause/Resume from either side; Finish on the watch opens the
      confirmation on the phone
- [ ] [DEVICE] Finish → one workout in Health/Fitness with the app's span
      (FR-5); Discard → none
- [ ] [DEVICE] Deny heart rate → the rest works, no heart rate shown (EF-2)

## Definition of done

- [x] Every functional requirement and acceptance criterion in `spec.md` is met
      or explicitly deferred with a TODO (device checks pending above)
- [x] `pnpm -r typecheck` and `pnpm -r test` green
- [x] Relevant `docs/roadmap/NN-*.md` checklist and progress log updated (coordinator)
- [ ] `spec.md` status set to `done`; `../backlog.md` updated (backlog row
      updated 2026-10-17; `done` waits for the device checks)
- [x] Constitution amended if this work settled a new invariant (none settled)
