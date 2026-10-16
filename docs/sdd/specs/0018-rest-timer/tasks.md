---
spec: 0018
status: approved     # self-approved under the delegated gates, 2026-10-16
created: 2026-10-16
---

# Tasks — Rest timer that keeps running

Each task leaves the tree green (`pnpm -r typecheck` and `pnpm -r test`).
One optional field in `packages/domain`, then mobile only: no migration and no
API task. Tasks 8 and 9 add native code and need `expo prebuild` and a device
rebuild; the JS reaches it through `requireOptionalNativeModule`, so every
commit runs on the current build.

The plan's commit 1 is split into tasks 3–6 so each one is small and verified
on its own; the order and the end state are the plan's.

## Task list

| # | Task | Area | Verify | Commit message |
|---|---|---|---|---|
| 1 | [x] Plan and tasks; backlog status → `in-progress` | docs | links resolve | `docs(sdd): plan and tasks for 0018` |
| 2 | [x] `HealthWorkoutPayload.restEndsAt?: ISODateString` in `packages/domain/src/health.ts`; nothing fills or reads it yet (`apps/api` does not import the type) | domain | `pnpm -r typecheck` + tests | `feat(domain): optional rest end on the live workout payload` |
| 3 | [x] `RunningRest` and `WorkoutSessionDraft.rest?` in `workoutDraftStore.ts`; pure helpers `resolveRestSeconds`, `setExerciseRest`, `startRest`, `adjustRest`, `skipRest`, `restPhase`; envelope hydration drops a malformed `rest` and keeps the workout; unit tests. No screen uses them yet | mobile | unit tests: manual → routine → default (FR-1), `setExerciseRest` leaves other exercises and the running rest alone (FR-2), 0 s starts nothing, `adjustRest` never earlier than now (FR-3), `restPhase` running / ended / stale, malformed `rest` dropped | `feat(workouts): running rest and per-exercise rest in the active workout` |
| 4 | [x] `restTimer/restAlerts.ts` (`RestAlerts` interface + `noopRestAlerts`); `restTimerRunner.ts` (schedule / cancel / JS timeout / `AppState` foreground, in-app vibration on `'ended'`, silent clear on `'stale'`, permission asked once per run) + tests with fakes and fake timers; `useRestTimerRunner` mounted in `_layout.tsx` behind `isAuthenticated && !isRestoringWorkout`. Inert until something writes `draft.rest` | mobile | runner tests: schedule on start, reschedule on ±15 s, cancel on skip / finish / discard (EF-2, AC-5), vibrate exactly once, stale cleared silently on foreground and on startup (EF-3), restored running rest rescheduled at the same `endsAt` (FR-7), permission requested once (EF-1) | `feat(workouts): one app-wide runner for the rest timer` |
| 5 | [ ] Switch the screen to the draft rest: `handleToggleDone` records the rest on the set and calls `startRest(resolveRestSeconds(…))`; `useRestRemaining`; `RestBar` pinned below the `ScrollView` (flex column, bottom safe area, −15 s / +15 s / Skip); rest card (wheels + Start) and `restDuration` removed; `src/lib/useRestTimer.ts` deleted; `WorkoutBar` shows the rest countdown in the accent colour with "Rest", its `TODO(sdd)` removed; i18n en/es (new keys, unused rest-card keys removed) | mobile | typecheck + tests; web preview: tick a set at the bottom of a long workout → `RestBar` on screen without scrolling (FR-4); ±15 s / Skip change only the countdown (FR-3); open History → the bar counts down, back → same remaining time (AC-3); reload the page mid-rest → it ends at the same instant (FR-7) | `feat(workouts): the rest timer belongs to the active workout` |
| 6 | [ ] Rest chip on each exercise header ("⏱ 2:00" / "⏱ Off"; Settings default for an exercise added mid-workout); `RestEditorSheet` (`Modal`, the two `WheelPicker`s, min 0–10, sec step 5, Save / Cancel) → `setExerciseRest`; i18n en/es | mobile | typecheck + tests; web preview: squats at 2:00 in the routine, set 3:30 from the chip, tick the next squat set → rest 3:30, routine detail still 2:00 (AC-1, FR-2) | `feat(workouts): change an exercise's rest during the workout` |
| 7 | [ ] `restTimer/nextSetToDo.ts` (block first — superset alternation by `order`, ties to the exercise listed first — then after the block, then before; none when all done) + tests; refs per set row and on the scroll content; when `rest` goes present → absent while mounted, `measureLayout` the target row and scroll it to about a third of the viewport | mobile | `nextSetToDo` tests (single, superset A1 → B1 → A2, finished block, all done); web preview: 6+ exercises, tick a set of the last one, skip → the next set scrolls into view (AC-4, FR-5) | `feat(workouts): bring the next set into view when a rest ends` |
| 8 | [ ] Local module `modules/rest-alert` (`index.ts`, `expo-module.config.json`, `ios/RestAlert.podspec`, `ios/RestAlertModule.swift`: `requestPermission`, `schedule` with fixed id `rest-timer`, `cancel` pending + delivered); `iosRestAlerts` in `restAlerts.ts`, chosen on iOS when the native module is present, no-op otherwise; notification body "Next: {exercise}" from `nextSetToDo` (generic when none); i18n en/es; `TODO(sdd)` for Android and for the possible double alert in the foreground | mobile (**native — rebuild**) | typecheck + tests (runner tests unchanged, alerts are injected); web preview still runs (no-op); **iOS device after rebuild:** permission asked once at the first rest (EF-1); tick, lock → phone and paired watch buzz with "Rest over" (AC-2, FR-6); tick, skip, lock → nothing (AC-5); deny permission → rest runs, in-app vibration only (EF-1); restart after the rest ended → no countdown, no second alert (EF-3) | `feat(workouts): alert when a rest ends outside the app` |
| 9 | [ ] Lock-screen countdown: `toLiveWorkoutPayload` fills `restEndsAt`; `sameRest` next to `samePause`; `liveWorkoutController.sync` pushes on rest change; `appleHealth.ts` calls native `setRest(workoutId, restEndsAtMs \| null)`; `ContentState.restEndsAt: Date?` and computed `staleDate` in **both** `WorkoutActivityAttributes.swift` copies; `ActivityStore.update`, `setRest` and `WorkoutActivityActions.setPaused` pass `state.staleDate`; widget shows the "Rest" `Text(timerInterval:countsDown:)` on the lock screen and compact Dynamic Island while `restEndsAt != nil && !context.isStale`; `TODO(sdd)` for the suspended-app stale render | mobile (**native — rebuild**) | `sameRest` and `toLiveWorkoutPayload` tests; controller test (push on rest change); the Swift-copies-identical test; **iOS device after rebuild:** tick, lock → countdown on the lock screen; it disappears when the rest ends (FR-8) | `feat(workouts): rest countdown on the lock screen` |
| 10 | [ ] Roadmap `02-rest-timer.md` checklist and log; backlog (0018 status; 0019's bar countdown done); spec status | docs | links resolve | `docs(sdd): close spec 0018 implementation` |

**Not verifiable in CI:** tasks 8 and 9 need `expo prebuild` and a device
build; their effect (AC-2, AC-5 on device, EF-1, FR-6, FR-8) is checked on the
owner's iOS device in one batch. Task 9 is a SHOULD and can be dropped without
affecting the others. Tasks 5–7 are checked on the web preview; their look on
the device goes in the same batch, with a Metro reload.

### Acceptance criteria → tasks

| AC | Task | How |
|---|---|---|
| AC-1 | 3, 6 | `resolveRestSeconds` / `setExerciseRest` tests + web preview |
| AC-2 | 8 | iOS device after rebuild (phone locked, paired watch) |
| AC-3 | 4, 5 | Runner tests + web preview (History and back); restart on device |
| AC-4 | 5, 7 | `nextSetToDo` tests + web preview (pinned bar, scroll to next set) |
| AC-5 | 4, 8 | Runner test (skip cancels the alert) + iOS device |

### Requirements → tasks

| Requirement | Task |
|---|---|
| FR-1 | 3, 5 |
| FR-2 | 3, 6 |
| FR-3 | 3, 5 |
| FR-4 | 5 (screen and `WorkoutBar`) |
| FR-5 | 7 |
| FR-6 | 4 (in app), 8 (outside the app) |
| FR-7 | 3, 4, 5 |
| FR-8 | 2, 9 |
| EF-1 | 4, 8 |
| EF-2 | 4 |
| EF-3 | 4, 8 |

## Progress log

- 2026-10-16 — Tasks written from the approved plan; self-approved (delegated gates).
- 2026-10-16 — Task 1: plan and tasks already committed; spec → `in-progress`. Backlog status left to the coordinator (parallel agents).

## Definition of done

- [ ] Every functional requirement and acceptance criterion in `spec.md` is met
      or explicitly deferred with a TODO
- [ ] `pnpm -r typecheck` and `pnpm -r test` green
- [ ] Relevant `docs/roadmap/NN-*.md` checklist and progress log updated
- [ ] `spec.md` status set to `done`; `../backlog.md` updated
- [ ] Constitution amended if this work settled a new invariant
