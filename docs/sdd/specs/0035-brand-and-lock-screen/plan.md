---
spec: 0035
status: approved     # self-approved under the delegated gates, 2026-10-18
created: 2026-10-18
---

# Plan — Brand, home header and lock-screen status

How `spec.md` gets built. App-only on the JS side plus native changes to the
Live Activity widget, the local Live Activity module, the watch app and the
iOS icon. No API change, no migration, no new dependency.

## Current state (verified in the code, 2026-10-18)

- **Tab roots** (`RoutinesListScreen`, `ExercisesListScreen`,
  `ProgressOverviewScreen`, `WorkoutHistoryScreen`, `SettingsScreen`) all
  start with `ui/ScreenTitle` (large title + optional action). The mark is
  drawn only in `AuthLandingScreen` and `ShareCard`, as Ionicons `pulse`.
- **Streak.** `progress/utils/trainingFrequency.summarizeTrainingFrequency`
  counts the run ending at the most recent *recorded* week of
  `GET /progress/weekly-volume` (weeks bucketed on the server, UTC).
- **Sessions.** `workoutsClient.list()` returns every saved session (newest
  first) with `routineId`, `startedAt` and sets with `performed`;
  `utils/sessionStats.summarizeSession` gives done sets and volume (kg).
  History already loads it with `progressClient.sessionRecords()`.
- **Routine order.** `routines/utils/groupRoutinesByFolder` (folders
  alphabetical, unfiled last, creation order inside).
- **Profile.** `profile/useProfileData` (focus-reloaded), `ProfileAvatar`
  (photo or initials, "?" when none).
- **Live Activity.** `WorkoutActivityAttributes` (`_shared` + identical copy
  in the module, test-enforced) carries pause, kcal and rest; the JS
  controller (`liveActivity/liveWorkoutController`) pushes only pause, rest
  and kcal changes. Finish is a `Link` to `traininghub://workouts/active?action=finish`.
- **Watch.** `WatchContext` (phone → watch) and `WatchEvent` (watch → phone,
  `transferUserInfo`, queued). `PhoneWatchLink` forwards user info only.
- **Icon.** `assets/icon.png` from `scripts/brand-assets.mjs` (Playwright,
  not installed here; Chrome is).

## Constitution check

| Article | Engaged? | Compliance |
|---|---|---|
| 1 — Scope | yes | Only FR-1 – FR-24. No routine ordering, no streak goals, no one-tap discard. |
| 2 — Template vs performed | yes | Today's routine reads `WorkoutSession.routineId` (provenance) and the routines list; nothing links or writes either. |
| 3 — Shared types | yes | `HealthWorkoutPayload` gains optional `upNext`, `setsDone`, `setsTotal`; `WatchWorkoutSnapshot` gains `setsDone`; `WatchWorkoutEvent` gains `discardRequested`. All in `packages/domain`. |
| 4 — kg canonical | yes | Volumes are summed in kg and converted with `lib/weight.ts` at display; the status's up-next text reuses the watch's `setTarget` (draft strings, already in the workout's unit). |
| 5 — Migrations | no | — |
| 6 — Integrations behind interfaces | yes | The status and watch changes stay behind `LiveWorkoutBridge` / `WatchWorkoutBridge`; screens never touch the native modules. |
| 8 — Committable | yes | See tasks.md; each task green. |
| 9 — Dependencies | yes | None added. Icon variants are generated with the system Chrome (headless screenshot) instead of Playwright. |
| 10 — TODOs | yes | Device-only checks are [DEVICE] tasks. |

## Design

### Pure derivations (unit-tested)

`src/lib/week.ts` — local-time weeks, Monday start (spec assumption):
`startOfWeek(date)`, `addDays`, `sameDay`, `weekDays(now)` (Mon–Sun),
`weekStreak(starts: Date[], now)` (glossary: consecutive weeks with a
workout ending this week, or last week while this week has none),
`countInWeek(starts, now)`.

`src/features/routines/utils/todaysRoutine.ts` — `todaysRoutine(routines,
sessions)`: FR-6 over `groupRoutinesByFolder` order; sessions newest first;
the first session whose `routineId` is in the list picks the group and the
next routine (wrapping); none → first routine of the list; no routines → null.

`src/features/progress/utils/weekComparison.ts` — `weekVolumeComparison(
sessions, now)`: this week's performed volume (kg), last week's volume up to
the same offset from Monday, last week's total, and `hasLastWeek`.
`latestRecord(sessionRecords)`: the newest session entry's first record in
`RECORD_TYPE_ORDER`.

`src/features/workouts/utils/discardMessage.ts` — the "N sets done will be
lost / No sets done yet" message key + count, from `countWorkoutSets`.

### Home header (FR-1 – FR-7, EF-1 – EF-5)

`features/routines/components/HomeHeader.tsx` under `ScreenTitle` on
Routines: avatar (32 pt in a 44 pt hit area) + greeting (`greeting.morning|
afternoon|evening`, with or without name), the two chips, and the Today card
(name, exercise count, Start → `useRoutineStart().startRoutine` so 0019's rule
applies). `RoutinesListScreen` loads routines, `workoutsClient.list()` and
`profileClient.get()` together; sessions and profile failures are caught to
`null` and only hide their parts (EF-3). Card hidden while a workout is
active (FR-7). EF-5: Start re-reads the routine by id
(`routinesClient.getById`) before starting via the routine screen — the
existing `useRoutineStart` already starts from a `Routine` object, so the
card reloads the list on 404 and shows a one-line notice.

### History week strip (FR-8 – FR-10)

`features/workouts/components/WeekStrip.tsx` (7 × 44 pt cells: initial,
date, dot; today outlined; future days disabled; selected filled lime).
`WorkoutHistoryScreen` keeps `selectedDay` state, filters by
`sameDay(startedAt, day)`, shows "No workouts on <weekday>" + Clear.

### Progress (FR-4, FR-11)

`ProgressOverviewScreen` also loads `workoutsClient.list()` and
`sessionRecords()` (each failure → `null`, hiding its card). New
`WeekSummaryCard` (volume, delta with arrow + words, last week's total) and
`LatestRecordCard` (tap → `/progress/exercises/:id`). `FrequencySummary`'s
streak takes `weekStreak` from the sessions when they loaded (FR-4); the
tile shows 0 per the shared definition.

### Brand mark (FR-13)

`ui/BrandMark.tsx`: Ionicons `pulse` in lime on a `primarySoft` rounded tile,
`accessible={false}`, `importantForAccessibility="no-hide-descendants"`,
`aria-hidden`. `ScreenTitle` draws it (24 pt tile) before the title on
every tab root. `EmptyState` / `StateView` accept `icon="brand"` → the mark
in the 64 pt tile; used by Routines and History empty states.

### Live workout status (FR-14 – FR-19, FR-21)

- Domain `HealthWorkoutPayload`: `upNext?: string | null`, `setsDone?`,
  `setsTotal?`.
- `liveWorkoutPayload.toLiveWorkoutPayload(draft, kcal, upNextText)`;
  `upNextText(draft)` = `"<exercise> · <setTarget>"` + ` · Round n` in a
  superset (reusing `watch/watchProtocol.setTarget` and `superset/rounds`);
  null when all done (the native side shows the "All sets done" label).
  `sameProgress(a, b)` so the controller pushes on tick/untick/add/remove.
- Native: `ContentState` gains optional `upNext`, `setsDone`, `setsTotal`;
  attributes gain optional `discardLabel`, `nextLabel`, `allDoneLabel`,
  `setsDoneFormat` (`"%d/%d"` spoken as "9 of 20 sets done" via a format
  label). Module gains `setProgress(workoutId, upNext, setsDone, setsTotal)`
  (optional in JS so an old binary ignores it).
- `WorkoutActivityWidget.swift`: `BrandMarkShape` (the pulse polyline,
  stroked) replaces the dumbbell; lock screen and expanded show up-next + a
  ring (`Circle().trim`) with "9/20"; during a rest the orange countdown is
  the largest figure with "Next: …" below and the clock secondary; compact
  leading = mark (pause glyph when paused), trailing = clock or orange rest;
  minimal = mark or orange rest. Discard is a small muted `Link` in the
  header row (far from Pause), to
  `traininghub://workouts/active?action=discard&workoutId=<id>`. Expanded
  omits it (FR-19 MAY).
- Smart Stack small view: up-next line and "9/20" when present (FR-18).

### Discard link in the app (FR-20, FR-21, EF-6, EF-7, EF-9)

`parseWorkoutAction` gains `discard`. `ActiveWorkoutScreen`: on
`action=discard` it clears the params; if there is an active workout whose
`clientId` equals `workoutId`, it asks with the counted message; confirming
re-checks the draft is still that workout (EF-9) then discards as the button
does. Otherwise (no workout, other workout) it shows "This workout has
already ended" and stays/redirects; the stale activity is ended by the
existing reconcile on app activation (0012 EF-3). EF-7 is the existing
sign-in gate (the link params are not replayed). The in-app Discard button
uses the same counted message.

### Watch discard (FR-22, EF-8, EF-9)

- `WatchContext` gains `setsDone` and labels `discard`, `discardConfirm`
  (format with the count already resolved on the phone: `discardTitle`,
  `discardLost`), `connectToDiscard`, `more`.
- `WorkoutView`: a "More" (ellipsis) button under the controls opens a sheet
  with Discard; Discard checks `WCSession.default.isReachable` — when not,
  shows "Connect to your iPhone to discard" and offers nothing (EF-8); when
  reachable, a `confirmationDialog` naming the sets; confirming sends
  `discardRequested` with `sendMessage` (immediate, never queued).
- `PhoneWatchLink` forwards `didReceiveMessage` like user info.
- `appleWatchWire.decodeWatchMessage` accepts `discardRequested`; the
  controller calls `onDiscardRequested(clientId)` → the hook discards
  (`clearActiveWorkout`), which ends the watch workout as `discarded` through
  the existing sync. A request for a workout that is not the active one is
  ignored (EF-9).

### Icon (FR-24)

`scripts/brand-assets.mjs` gains `icon-dark.png` (lime mark on transparent)
and `icon-tinted.png` (white mark on transparent, the system tints it) and
switches to the system Chrome's headless screenshot when Playwright is
missing. `app.json` `ios.icon` = `{ light, dark, tinted }`; the base `icon`
is unchanged (Android, web, iOS < 18).

## Files

New: `lib/week.ts` (+test), `routines/utils/todaysRoutine.ts` (+test),
`progress/utils/weekComparison.ts` (+test), `workouts/utils/discardMessage.ts`
(+test), `ui/BrandMark.tsx`, `routines/components/HomeHeader.tsx`,
`workouts/components/WeekStrip.tsx`, `progress/components/WeekSummaryCard.tsx`,
`progress/components/LatestRecordCard.tsx`, `assets/icon-dark.png`,
`assets/icon-tinted.png`.

Changed: `ScreenTitle`, `EmptyState`, `StateView`, the five tab roots,
`FrequencySummary`, `workoutAction.ts`, `ActiveWorkoutScreen`,
`liveWorkoutPayload.ts`, `liveWorkoutController.ts`,
`useLiveWorkoutController.ts`, `appleHealth.ts`, `appleWatch.ts`,
`appleWatchWire.ts`, `watchProtocol.ts`, `watchWorkoutController.ts`,
`packages/domain/src/health.ts`, both `WorkoutActivityAttributes.swift`,
`WorkoutLiveActivityModule.swift`, `modules/workout-live-activity/index.ts`,
`WorkoutActivityWidget.swift`, `targets/watch/{WatchWire,WorkoutModel,WorkoutView}.swift`,
`PhoneWatchLink.swift`, `app.json`, `scripts/brand-assets.mjs`, i18n.

## Risks

- **Activity decoding.** New `ContentState` fields are optional, so an
  activity started by an old build decodes; attributes fields too.
- **sendMessage wakes the iPhone app** in the background; if JS is not alive
  the reply fails and the watch says to connect (treated as EF-8).
- **Lock-screen size.** The rest layout must fit in the 160 pt the system
  allows; checked on the device.
- **Week bucketing.** Local weeks on the phone vs UTC weeks on the server's
  weekly-volume chart: the chart is unchanged; only the streak moves to the
  phone so chip and tile agree (FR-4).
