---
spec: 0036
status: in-progress  # self-approved under the delegated gates, 2026-10-18
created: 2026-10-18
---

# Tasks — Home-screen widget

| # | Task | Area | Verify | Commit message |
|---|---|---|---|---|
| 1 | [x] Plan and tasks; spec `in-progress` | docs | — | `docs(sdd): plan and tasks for 0036` |
| 2 | [x] Snapshot derivation (pure) and bridge; sync hook; start link on Routines | mobile | unit tests | `feat(widget): home-screen widget data from the app` |
| 3 | [x] Native module, widget views, opt-in App Group (`TRAININGHUB_HOME_WIDGET=1`) | native | swiftc; **native rebuild** | `feat(widget): home-screen and lock-screen widgets` |
| 4 | [x] Spike in the device build: does the free team sign the App Group? | device | build log | — |
| 5 | [x] Progress log, backlog, roadmap | docs | — | `docs(sdd): record 0036 implementation` |
| 6 | [ ] [DEVICE] AC-1 – AC-14 | device | owner | — |

## Progress log

- (2026-10-18) Tasks 1–5 done; calls made by the assistant under the delegated
  gates, revisable. **Spike result: the free team signs the App Group.**
  Prebuild with `TRAININGHUB_WATCH_APP=1 TRAININGHUB_HOME_WIDGET=1`, Release
  `xcodebuild -allowProvisioningUpdates` for the iPhone succeeded, and
  `codesign -d --entitlements` shows `group.com.joaquin.traininghub` on both
  `TrainingHub.app` and `WorkoutActivity.appex` (team 23X2PC36Y7); installed
  on the iPhone. The 0012 note about App Groups and the free team no longer
  holds. The widget-target entitlement had to be set in the target's own
  config (the plugin only syncs App Groups into targets that declare
  entitlements). **App side**: `homeWidget/snapshot.ts` (pure, tested):
  streak, performed sets this week, trained days, today's routine, whether
  there are routines; `useHomeWidgetSync` pushes on sign-in/out, foreground,
  background and active-workout start/pause/end (refetching after an end),
  keeping the last figures on a failed fetch; `homeWidgetBridge` → local
  module `modules/home-widget` (`setSnapshot` → App Group defaults +
  `reloadAllTimelines`). Routines handles `?start=<id>` (re-read, 404 →
  notice, 0019 sheet). **Widget** (`targets/workout-activity/HomeWidget.swift`,
  same extension): small (streak, sets), medium (streak, sets, Mon–Sun dots
  with initials and today ringed, Start or Create a routine), lock-screen
  circular (streak or clock) and rectangular (dots + sets or clock), workout
  in progress with the system clock (paused stops it), signed-out "Sign in",
  no data "TrainingHub"; timeline entries at the next two Mondays so a new
  week shows empty with the streak carried only through last week.
