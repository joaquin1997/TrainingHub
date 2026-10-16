---
spec: 0018
status: approved     # self-approved under the delegated gates, 2026-10-16
created: 2026-10-16
---

# Plan — Rest timer that keeps running

Mobile only, plus one optional field in a shared contract. No schema or API
change. Needs a device rebuild (new local native module, Live Activity change).

## Constitution check

| Article | Engaged? | Compliance |
|---|---|---|
| 1 — Scope control | yes | Rest in the active workout, per-exercise rest, pinned countdown, scroll to the next set, an alert outside the app, the countdown on the bar and the lock screen. No watch app, no superset rest rule, no custom sounds. The standalone rest card (wheel + Start) is removed rather than kept alongside the per-exercise rest; see Approach §3. |
| 2 — Template vs performed | yes | The per-exercise rest is written to the `WorkoutExerciseDraft` (performed side). The `Routine` is only read, at start, as today. AC-1 checks that the routine is unchanged. |
| 3 — Shared domain types | yes | `HealthWorkoutPayload` gains an optional `restEndsAt`. It is defined once, in `packages/domain`. `apps/api` does not use this type (verified: no import), so the API is unaffected. The new `RestAlerts` interface is mobile-only and lives in `apps/mobile`, like `TokenStorage` and `ActiveWorkoutStorage`. |
| 4 — Weight in kg | no | No weight is involved. |
| 5 — Prisma migrations | no | The rest per set is already saved (`WorkoutSet.restSeconds`). |
| 6 — Integrations behind interfaces | yes | The rest alert goes through a `RestAlerts` interface (`requestPermission` / `schedule` / `cancel`). The iOS implementation is the only code that imports the native module. Android and web get a no-op. The lock-screen countdown goes through the existing `LiveWorkoutBridge`. |
| 7 — Secrets | no | |
| 8 — Committable + verified | yes | Five code commits, each green on `pnpm -r typecheck` and `pnpm -r test` (see "Commit order"). The native commits only add code that the JS side reaches through `requireOptionalNativeModule`, so the JS bundle works before the rebuild. |
| 9 — Dependencies | yes | **No new package.** `expo-notifications` was rejected (see Alternatives). Instead there is a new **local** Expo module, `modules/rest-alert` (Swift, about 50 lines), like `modules/health-energy`. It is native code, so it **needs `expo prebuild` and a device rebuild**. The spec's NFR already expects that. |
| 10 — TODOs over half-solutions | yes | Three TODOs, all listed in Risks: the Android alert outside the app, a possible double alert in the foreground, and the Live Activity after the rest ends while the app is suspended. |

## Current state (verified in the code)

- **Rest countdown.** `useRestTimer` (`src/lib/useRestTimer.ts`) is React
  state local to `ActiveWorkoutScreen`. It keeps the end time in a ref and
  ticks every 250 ms. It is lost when the screen unmounts and is not in the
  draft, so it is not persisted (spec 0010) and the `WorkoutBar` (0019) cannot
  read it. There is a `TODO(sdd)` for this in `WorkoutBar.tsx`.
- **Its only alert** is `Vibration.vibrate([0, 400, 200, 400])` in the
  `onComplete` of that hook. JS timers stop when the app is suspended, so
  nothing fires with the phone locked.
- **Which rest a ticked set uses.** `handleToggleDone` runs
  `exercise.restSeconds ?? restDuration`.
  - `exercise.restSeconds` is copied from the routine at start
    (`buildExerciseDrafts`).
  - `restDuration` is the rest card's wheel. It starts at
    `settings.defaultRestSeconds`.

  So the wheel is used only when the routine has no rest for that exercise.
  This is the reported bug "a rest set by hand is ignored". The rest used is
  recorded on the set (`WorkoutSetDraft.restSeconds`) and saved.
- **Rest card.** This is a card near the top of the scroll. It shows one of
  two things:
  - a ring with −15 s / +15 s / Skip, while a rest runs;
  - otherwise, the min/sec wheels (`WheelPicker`) and a Start button, which
    starts a rest without ticking a set.

  When the person is at the bottom of a long workout, the card is out of view.
- **Persistence.** The draft is written to the device after every change
  (300 ms debounce, flushed on background). The envelope check
  (`looksLikeDraft`) ignores unknown fields, so new optional fields need no
  version bump.
- **Live Activity.** `WorkoutActivityAttributes.ContentState` has `pausedAt`,
  `pausedSeconds` and `activeKcal`. Two copies of the Swift file must stay
  identical; a test checks this. `liveWorkoutController.sync` pushes only
  pause changes, and kcal goes through its own path.
- **No push entitlement.** `WorkoutLiveActivityModule.swift` notes that the
  developer team is a free one, with no push entitlement.
- **Root-level runners.** `RootNavigator` already mounts
  `useActiveWorkoutPersistence` and `useLiveWorkoutController`. These are
  app-wide effects that follow the draft store.

## Approach

The running rest becomes part of the active workout. One app-wide runner
watches the workout and turns the rest into alerts. The workout screen and the
bar only display the rest.

### 1. The rest lives in the draft (FR-1, FR-2, FR-3, FR-7)

```ts
type RunningRest = {
  endsAt: string;            // ISO, absolute: survives restarts (FR-7)
  totalSeconds: number;      // for the ring/progress line
  workoutExerciseId: string; // whose set started it
};
WorkoutSessionDraft.rest?: RunningRest;
```

Pure functions in `workoutDraftStore.ts`, next to `pauseWorkout`:

- `resolveRestSeconds(exercise, defaultRestSeconds)`: returns
  `exercise.restSeconds ?? defaultRestSeconds` (FR-1).
- `setExerciseRest(draft, workoutExerciseId, seconds)`: overwrites that
  exercise's `restSeconds` in the draft (FR-2).
  - The draft's `restSeconds` holds the routine's value until the person
    changes it. From then on it holds theirs, so "manual, otherwise routine,
    otherwise Settings" is a single `??`.
  - The routine is never written (Article 2).
  - It does not touch a running rest.
- `startRest(draft, workoutExerciseId, seconds, now)`: replaces any running
  rest. A rest of 0 seconds or less starts nothing.
- `adjustRest(draft, deltaSeconds, now)` and `skipRest(draft)` change only
  `draft.rest` (FR-3).
  - `adjustRest` never sets the end earlier than now.
  - `totalSeconds` grows with extra time, as `useRestTimer.adjust` does today.
- `restPhase(rest, now)` returns one of:
  - `'running'`
  - `'ended'`: within 2 s past the end
  - `'stale'`: longer ago

  The runner uses `'stale'` to avoid alerting late (EF-2, EF-3).

`handleToggleDone` keeps recording the rest on the set. Then it calls
`startRest` with `resolveRestSeconds(exercise, settings.defaultRestSeconds)`.
`restDuration` and the wheel state go away. `useRestTimer` is deleted. A
small `useRestRemaining(rest)` hook replaces it for display: it ticks every
250 ms and derives the remaining seconds from `endsAt`.

Un-ticking a set leaves a running rest alone, as today. Pausing the workout
does not pause the rest. Spec 0011 says that rest is not pause.

### 2. One runner for alerts (FR-6, EF-1, EF-2, EF-3)

`startRestTimerRunner({ alerts, store, onEnded, now })` follows the pattern of
`startLiveWorkoutController`. It is a plain function with injected
dependencies, unit-tested with fakes and fake timers. `useRestTimerRunner`
mounts it in `RootNavigator`, enabled once the stored workout is restored.

On every store change, it compares `draft?.rest?.endsAt` with the last one it
handled:

- **New or moved end**:
  1. Cancel the scheduled alert.
  2. Schedule a new one at `endsAt`. The title is "Rest over" and the body
     is "Next: {exercise}", where the exercise is the one of the next set to
     do (`nextSetToDo`, §3). In a superset that is the other exercise, not
     the one whose set was ticked. With no set left to do, the body is
     generic.
  3. Arm a JS timeout for `endsAt`.

  The first schedule in each app run calls `alerts.requestPermission()`.
  iOS shows its prompt only once; later calls return the stored answer
  (EF-1).
- **Rest gone** (skipped, the workout finished or discarded, or a sign-out
  cleared it): cancel the alert and clear the timeout (EF-2, AC-5).
- **The timeout fires**, or **the app returns to the foreground** (an
  `AppState` listener):
  - `'ended'` and the app active: vibrate (today's pattern), then
    `store.set({ ...draft, rest: undefined })`.
  - `'stale'`: clear the rest without vibrating. The system alert already
    fired, or the app was not running (EF-3).
- **At startup** after a restore: the first sync sees `'stale'` and clears
  the rest silently (EF-3). A rest that is still running is rescheduled at the
  same `endsAt` (FR-7). Scheduling with the same identifier replaces the
  pending alert, so it never fires twice.

When permission is denied, `schedule` delivers nothing. The rest still runs,
and the in-app vibration still happens (EF-1).

**Alert implementation.** `RestAlerts`, `iosRestAlerts` and `noopRestAlerts`
live in `src/features/workouts/restTimer/`. `iosRestAlerts` calls the new
local module `modules/rest-alert`:

- `requestPermission(): Promise<boolean>`: `UNUserNotificationCenter`
  `requestAuthorization([.alert, .sound])`
- `schedule(atMs, title, body)`: one `UNNotificationRequest` with the fixed
  identifier `rest-timer`, a `UNTimeIntervalNotificationTrigger` and the
  default sound
- `cancel()`: removes the pending and delivered `rest-timer`

A local notification needs no entitlement, so the free team can sign it. iOS
forwards it to a paired watch while the phone is locked or asleep. That is the
spec's watch assumption, and it is how AC-2 is met.

### 3. On screen: pinned countdown and per-exercise rest (FR-2, FR-4, FR-5)

- **`RestBar`** is a new component. The active screen becomes a flex column:
  the `ScrollView` takes `flex: 1` and the `RestBar` sits below it, inside the
  bottom safe area. It shows "Rest", the countdown, a thin progress line, and
  −15 s / +15 s / Skip. It renders only while a rest runs.
  - It is in the layout flow, so it never covers the last set, the Finish
    button or the notes.
  - This is the spec's assumption: a pinned bar, not an auto-scroll to the
    card.
- **The rest card is removed** (wheels + Start). **[ASSUMPTION: no rest
  without ticking a set.]**
  - With per-exercise rest and the Settings default, the wheel would only
    feed "Start". A second place to set a rest, which applies to nothing
    else, is what caused the reported bug.
  - Hevy has no standalone rest either.
  - To restore it later, add a "Start" button to the rest editor.
- **Per-exercise rest.** Each exercise header gets a small chip: "⏱ 2:00",
  or "⏱ Off" for 0. Tapping it opens a `Modal` sheet with the two existing
  `WheelPicker`s (min 0–10, sec in steps of 5), Save and Cancel. Save calls
  `setExerciseRest` (FR-2). An exercise added mid-workout has no rest yet, so
  its chip shows the Settings default.
- **Next set into view (FR-5).**
  - `nextSetToDo(draft, workoutExerciseId)` is a pure helper. It looks in the
    block (single exercise or superset) of the exercise whose set started the
    rest. There it picks the not-done set with the lowest `order`; ties go to
    the exercise listed first. So in a superset A1 → B1 → A2, and in a plain
    exercise it is the next set. If the block has no set left to do, it takes
    the first not-done set after the block, then before it. If every set is
    done, there is no target.
  - The screen keeps a ref to each set row and one to the scroll content.
    When `rest` goes from present to absent while the screen is mounted
    (ended or skipped), the screen measures the target row with
    `measureLayout` against the content and scrolls it to about a third of
    the viewport height.
  - A finish or discard unmounts the screen, so there is no scroll in those
    cases.

### 4. The bar and the lock screen (FR-4 everywhere, FR-8)

- **`WorkoutBar`** reads `workout.rest`. While a rest runs, the clock becomes
  the rest countdown in the accent colour, and the label reads "Rest". This
  resolves 0019's TODO.
- **Live Activity:**
  - `HealthWorkoutPayload.restEndsAt?: ISODateString` is the new field.
    `toLiveWorkoutPayload` fills it.
  - `liveWorkoutController.sync` also pushes when `restEndsAt` changes. A
    tested helper, `sameRest`, decides this, like `samePause`.
  - `appleHealthLiveWorkoutBridge.updateLiveWorkout` calls the new native
    `setRest(workoutId, restEndsAtMs | null)`. It updates
    `ContentState.restEndsAt: Date?` with `staleDate = restEndsAt`.
  - The widget shows a "Rest" countdown,
    `Text(timerInterval: …restEndsAt, countsDown: true)`, while
    `restEndsAt != nil && !context.isStale`. It shows this on the lock screen
    and in the compact Dynamic Island. When the stale date passes, the system
    re-renders the activity without the row, even with the app suspended.
  - Every update today passes `staleDate: nil`: `ActivityStore.update` (pause
    and kcal) and `WorkoutActivityActions.setPaused` (the lock-screen
    intents). A kcal update during a rest would then erase the rest's stale
    date. So `ContentState` gains a computed `staleDate` (`restEndsAt` if it
    is still in the future, otherwise nil), and all three call sites pass
    `state.staleDate`. It lives in the shared attributes file, so both copies
    stay identical.
  - The new `ContentState` field is optional, so an activity from the previous
    build still decodes. A rebuild ends and restarts activities anyway, by
    reconciling.
  - `androidHealthConnect`'s bridge stays a no-op.

### Alternatives considered

- **`expo-notifications`.** This is the mature, cross-platform answer, and
  0005 named it. Rejected because its config plugin adds the `aps-environment`
  (push) entitlement. The project's free team cannot sign that, as the Live
  Activity module already notes. Removing the entitlement would need a custom
  config plugin that fights the library's. The library is also far larger
  than the three calls needed. It remains the path for Android (see Risks).
- **The countdown in a React context instead of the draft.** It would survive
  leaving the screen, but not a restart (FR-7). It would also need its own
  persistence, and the bar and the lock screen would need a second source.
  Rejected. The draft is already persisted, observed and owner-scoped.
- **A separate `restOverrideSeconds` next to the routine's rest.** It would
  keep the routine value visible, but no screen needs it. The FR-1 order would
  become two fallbacks instead of one. Rejected. The routine itself still holds
  its value (AC-1).
- **Auto-scrolling to the rest card when a set is ticked.** Rejected in the
  spec's assumption: it moves the list under the thumb and then needs a scroll
  back.
- **Scheduling a Live Activity alert (`alertConfiguration`) instead of a
  notification.** That only works from an update the app makes at that
  moment, and the app is suspended when the rest ends. Rejected.
- **Keeping the rest card's wheel as "the next rest for everything".** That
  is what made the manual rest lose to the routine's. Rejected (see §3).

## Shared contracts (`packages/domain`)

- `HealthWorkoutPayload.restEndsAt?: ISODateString`: the end of the running
  rest, or absent.
  - `apps/mobile`: filled in `toLiveWorkoutPayload` and read by the Apple
    bridge.
  - `apps/api`: does not use the type. No change.

## Data model and migrations

None. The rest per set is already saved.

- Migration name: —
- Backfill / data migration needed: no

On the device, the draft gains `rest?` and keeps `WorkoutExerciseDraft.restSeconds`.
The envelope version stays 1. Old drafts have no `rest`, so nothing changes
for them. If a stored `rest` is malformed (`endsAt` not a date), the
hydration drops it and keeps the workout.

## API surface (`apps/api`)

None.

## Mobile surface (`apps/mobile`)

- `workoutDraftStore.ts`: `RunningRest`, `rest?`, and the six helpers.
- New `src/features/workouts/restTimer/`:
  - `restAlerts.ts`: the interface plus the iOS and no-op implementations
  - `restTimerRunner.ts` (+ test)
  - `useRestTimerRunner.ts`
  - `nextSetToDo.ts` (+ test)
  - `useRestRemaining.ts`
- New components `RestBar.tsx` and `RestEditorSheet.tsx`, in
  `src/features/workouts/components/`.
- `ActiveWorkoutScreen.tsx` changes:
  - the rest card is removed
  - the `RestBar` is added below the scroll
  - each exercise header gets a rest chip and the sheet
  - ticking a set starts the rest in the draft
  - when a rest ends, the next set is scrolled into view
- `WorkoutBar.tsx`: shows the rest countdown.
- `_layout.tsx`: `useRestTimerRunner(isAuthenticated && !isRestoringWorkout)`.
- Live Activity: payload, controller, bridge, native `setRest`, both
  `WorkoutActivityAttributes.swift` copies, and the widget.
- New i18n keys (ES/EN): rest over (title/body), rest chip and editor, "Off".
  The unused rest-card keys go away.
- **Native rebuild required**:
  - new local module `modules/rest-alert`
  - `ContentState` change and widget change
  - no `app.json` change, because a local notification needs no entitlement
    or Info.plist key

## Testing strategy

Unit tests (vitest, pure or with fakes):

- **Draft helpers:**
  - `resolveRestSeconds`: manual, routine, then default
  - `setExerciseRest`: leaves other exercises and the running rest alone
  - `startRest` (and 0 seconds starts nothing)
  - `adjustRest`, which never goes earlier than now
  - `skipRest`
  - `restPhase`: running, ended or stale
- **`restTimerRunner`**, with fake `RestAlerts`, a fake store and fake timers:
  - schedule on start
  - reschedule on ±15 s
  - cancel on skip, finish and discard
  - vibrate exactly once at the end
  - silent clear when stale on foreground and on startup
  - permission requested once
  - a still-running rest restored after a restart is rescheduled at the same
    `endsAt`
- **`nextSetToDo`**: single exercise, superset alternation, a finished block,
  and all sets done.
- **`sameRest`** and `toLiveWorkoutPayload` with `restEndsAt`.
- **Envelope hydration** with a malformed `rest`.

The web preview (web + local API on PGlite) covers the pinned bar, the
per-exercise rest, the bar countdown and the scroll. On web the alerts use the
no-op implementation. The lock screen, the watch and the background alert can
only be checked on the owner's iOS device after a rebuild.

| Spec AC | Verified by |
|---|---|
| AC-1 | `resolveRestSeconds` and `setExerciseRest` tests. Web preview: a routine with squats at 2:00, set 3:30 from the chip, tick the next squat set. The bar shows 3:30, and the routine detail still says 2:00. |
| AC-2 | Device batch: tick a set, lock the phone, and wait. The phone and the paired watch buzz with "Rest over". |
| AC-3 | Runner test (the rest survives store changes and is not tied to a screen). Web preview: tick a set, open History. The bar counts down; back on the workout the `RestBar` shows the same remaining time. Restart covered by the runner restore test, and on device. |
| AC-4 | `nextSetToDo` tests. Web preview: a workout of 6+ exercises; tick a set of the last one. The `RestBar` is on screen without scrolling; skip, and the next set scrolls into view. |
| AC-5 | Runner test (skip cancels the scheduled alert). Device batch: tick, skip, lock; nothing buzzes. |

## Files to touch

- `packages/domain/src/health.ts`: `restEndsAt`.
- `apps/mobile/src/features/workouts/state/workoutDraftStore.ts` (+ `.test.ts`):
  `RunningRest` and the rest helpers.
- `apps/mobile/src/features/workouts/persistence/activeWorkoutPersister.ts` or
  `activeWorkoutEnvelope.ts` (+ test): drop a malformed `rest` on restore.
- `apps/mobile/src/features/workouts/restTimer/restAlerts.ts`: new.
- `apps/mobile/src/features/workouts/restTimer/restTimerRunner.ts` (+ `.test.ts`): new.
- `apps/mobile/src/features/workouts/restTimer/useRestTimerRunner.ts`: new.
- `apps/mobile/src/features/workouts/restTimer/nextSetToDo.ts` (+ `.test.ts`): new.
- `apps/mobile/src/features/workouts/restTimer/useRestRemaining.ts`: new.
- `apps/mobile/src/features/workouts/components/RestBar.tsx`: new.
- `apps/mobile/src/features/workouts/components/RestEditorSheet.tsx`: new.
- `apps/mobile/src/features/workouts/screens/ActiveWorkoutScreen.tsx`: see the
  Mobile surface section.
- `apps/mobile/src/features/workouts/components/WorkoutBar.tsx`: the rest
  countdown, and the TODO removed.
- `apps/mobile/src/app/_layout.tsx`: mount the runner.
- `apps/mobile/src/lib/useRestTimer.ts`: deleted.
- `apps/mobile/modules/rest-alert/`: new. `index.ts`,
  `expo-module.config.json`, `ios/RestAlert.podspec` and
  `ios/RestAlertModule.swift`.
- `apps/mobile/src/features/workouts/liveActivity/liveWorkoutPayload.ts`
  (+ test): `restEndsAt`, `sameRest`.
- `apps/mobile/src/features/workouts/liveActivity/liveWorkoutController.ts`
  (+ test): push rest changes.
- `apps/mobile/src/features/health/providers/appleHealth.ts`: `setRest`.
- `apps/mobile/modules/workout-live-activity/index.ts`,
  `ios/WorkoutLiveActivityModule.swift` and
  `ios/WorkoutActivityAttributes.swift`, plus
  `targets/workout-activity/_shared/WorkoutActivityAttributes.swift`,
  `targets/workout-activity/_shared/WorkoutActivityIntents.swift` (the stale
  date) and `targets/workout-activity/WorkoutActivityWidget.swift`.
- `apps/mobile/src/i18n/locales/en.ts`, `es.ts`: keys.
- `docs/roadmap/02-rest-timer.md`, `docs/sdd/backlog.md`: status. The glossary
  already defines **rest timer**.

## Commit order

1. `feat(workouts): the rest timer belongs to the active workout`: the draft
   helpers, the runner with the no-op alerts (in-app vibration only), the
   `RestBar`, the per-exercise rest, the rest card removed, and the
   `WorkoutBar` countdown. This covers FR-1 to FR-4, FR-7, AC-1 and AC-3.
2. `feat(workouts): bring the next set into view when a rest ends`: covers
   FR-5 and AC-4.
3. `feat(workouts): alert when a rest ends outside the app`: the
   `rest-alert` module, `iosRestAlerts` and the permission. Covers FR-6,
   EF-1, AC-2 and AC-5. Needs a rebuild.
4. `feat(workouts): rest countdown on the lock screen`: covers FR-8. Needs a
   rebuild. It can be dropped without affecting the others (SHOULD).
5. `docs(sdd): close spec 0018 implementation`.

## Risks and open questions

- `TODO(sdd): rest alert outside the app on Android — noopRestAlerts there
  (in-app vibration only); unblocked by adding expo-notifications for Android
  or an Android branch in modules/rest-alert, when Android is tested.` iOS is
  the target, and the owner tests on iOS.
- `TODO(sdd): possible double alert in the foreground — iOS does not present a
  local notification while the app is in front unless a
  UNUserNotificationCenter delegate asks for it; no installed module is known
  to set one, but this is unverified; check on the device, and if it shows,
  have the runner skip the in-app vibration while the alert is scheduled.`
- `TODO(sdd): Live Activity after the rest ends with the app suspended relies on
  staleDate re-rendering the widget with isStale; unverified on the device —
  worst case the row shows 0:00 until the app next updates the activity.`
  This affects only FR-8, which is a SHOULD.
- **Focus and Silent mode.** A normal local notification follows the
  person's Focus settings. "Time sensitive" would bypass Focus, but it needs
  an entitlement. That is out of scope, and noted for 0025.
- **`measureLayout` against the scroll content** (FR-5) works on the new
  architecture and on react-native-web. If it misbehaves on one of them, the
  fallback is to scroll to the exercise card's `onLayout` position (the
  card is a direct child of the scroll content). The scroll then shows the
  exercise rather than the exact set.
- **The keyboard covers the `RestBar`** while a field is being typed in. The
  scroll keeps its keyboard inset (0019 FR-6), so the field stays visible.
  The countdown comes back when the keyboard closes, and the alert still
  fires. Accepted. Lifting the bar above the keyboard would move it under the
  person's thumb on every field.
- **Removing the standalone rest** (the assumption in §3) is a visible
  change. If the owner misses it, a "Start" button on the rest editor sheet
  brings it back without changing the model.

## Rollout

Mobile only. The domain change is an optional field that nothing on the server
reads. The JS commits (1–2) work on the current build with in-app alerts
only. `requireOptionalNativeModule` returns null until the rebuild, so
commits 3–4 also run on an old build without crashing; they only gain their
effect after `expo prebuild` and a device build. A stored draft from the
previous bundle restores as-is, with no rest. To roll back, revert the
commits. A draft that holds a `rest` is still readable by older bundles,
because they ignore unknown fields.
