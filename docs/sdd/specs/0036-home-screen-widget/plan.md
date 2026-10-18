---
spec: 0036
status: approved     # self-approved under the delegated gates, 2026-10-18
created: 2026-10-18
---

# Plan — Home-screen widget

## Current state (verified in the code, 2026-10-18)

- One widget extension, `targets/workout-activity` (`@bacons/apple-targets`),
  holding only the Live Activity (`WorkoutActivityBundle`). Deployment
  target iOS 17. Free team `23X2PC36Y7`; no App Group anywhere.
- `@bacons/apple-targets` copies the main app's App Groups to widget targets
  when `ios.entitlements["com.apple.security.application-groups"]` is set.
- Since 0035 the phone derives the **week streak** and **today's routine**
  (`lib/week.ts`, `routines/utils/todaysRoutine.ts`) from
  `workoutsClient.list()` and `routinesClient.list()`.
- Links: `traininghub://workouts/active` opens the workout; Routines starts
  a routine through `useRoutineStart` (0019 sheet) and, from the Today card,
  re-reads it first (0035 EF-5).

## Spike first (the spec's TODO)

The widget needs the app's figures. The usual route — a shared
`UserDefaults` in an App Group — needs the App Groups capability, which the
0012 plan recorded as unavailable to the free team. The spike is run in the
owner's device build: prebuild with `TRAININGHUB_HOME_WIDGET=1` (App Group
`group.com.joaquin.traininghub` on the app and, synced, on the extension)
and sign with the free team.
- **Signs**: the widget ships as planned.
- **Does not sign**: the build is made without the flag; the widget code is
  in place but the extension's widget shows the neutral "Open TrainingHub"
  state (EF-10), and the spec waits for a paid account (owner's call). No
  other route is proposed: keychain sharing and network fetches from the
  extension need the same kind of entitlement or the session token in the
  extension.

## Constitution check

| Article | Engaged? | Compliance |
|---|---|---|
| 1 | yes | Small + medium + two lock-screen accessories; no Android, no background refresh, no in-widget actions. |
| 2 | yes | Reads templates and performed workouts separately. |
| 3 | no | The snapshot is a mobile ↔ extension wire, not an app ↔ API contract. |
| 6 | yes | `HomeWidgetBridge` (`features/homeWidget/bridge.ts`); screens never call the module. |
| 9 | yes | No dependency; a local module `modules/home-widget`; native → rebuild. |
| 10 | yes | The signing route is the spike above, not assumed. |

## Design

- **Snapshot** (`features/homeWidget/snapshot.ts`, pure, tested):
  `{ v, signedIn, weekStart (local Monday, ms), days[7], setsThisWeek, streak,
  weekHadWorkout, today?: { id, name }, hasRoutines, active?: { routineName,
  startedAtMs, pausedAtMs?, pausedSeconds }, labels }`. Sets = performed
  sets of workouts started this week (warm-ups and timed sets included).
- **Sync** (`useHomeWidgetSync`, root layout): on sign-in/out, app
  foreground and background, active-workout start/end/pause, and after a
  workout is saved: fetch routines + workouts (in parallel); on failure keep
  the last history part and refresh only the active workout (EF-8). Signing
  out writes the signed-out snapshot at once (EF-1); a new account writes
  signed-out first, then its own (EF-3).
- **Native module** `modules/home-widget`: `setSnapshot(json)` →
  `UserDefaults(suiteName:)`, `WidgetCenter.reloadAllTimelines()`; returns
  false without the App Group.
- **Widget** (`targets/workout-activity/HomeWidget.swift`, same extension):
  `StaticConfiguration` for `.systemSmall`, `.systemMedium`,
  `.accessoryCircular`, `.accessoryRectangular`. Timeline: now, next local
  Monday 00:00, the Monday after (FR-14: empty week, streak carried only if
  the snapshot's week had a workout). Clock with `Text(timerInterval:
  pauseTime:)`. Links: widget → `traininghub://routines` or
  `traininghub://workouts/active`; Start → `traininghub://routines?start=<id>`;
  Create → `traininghub://routines/create`.
- **Start link**: Routines reads `start`, re-reads the routine (404 → notice,
  EF-6) and starts it through `useRoutineStart` (0019, FR-10).
