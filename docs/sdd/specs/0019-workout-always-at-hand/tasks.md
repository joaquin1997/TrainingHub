---
spec: 0019
status: in-progress  # self-approved under the delegated gates, 2026-10-16
created: 2026-10-16
---

# Tasks — The workout in progress is always at hand

Each task leaves the tree green (`pnpm -r typecheck` and `pnpm -r test`).
Mobile only: no domain, migration or API task. No native rebuild (the new
dependency is JS-only).

## Task list

| # | Task | Area | Verify | Commit message |
|---|---|---|---|---|
| 1 | [x] Plan and tasks; backlog status | docs | links resolve | `docs(sdd): plan and tasks for 0019` |
| 2 | [x] `@react-navigation/bottom-tabs` as a direct dependency (`npx expo install`, same version as expo-router's); `WorkoutBar` (dot, routine, clock, paused state, tap → `/workouts/active`); mounted in the tabs' `tabBar` above `BottomTabBar` and under `workouts/[workoutId]` and `workouts/summary` with the bottom inset; Routines active card removed; i18n en/es for the bar's accessibility label | mobile | typecheck + tests; web preview: AC-1, EF-2 (last History row reachable, tab bar uncovered) | `feat(workouts): workout bar on every screen` |
| 3 | [x] `resolveRoutineStart` (start / open / ask) and `resolveSwitchOutcome` (save / discard) next to `resolveActiveWorkoutEntry`; `parseWorkoutAction` learns `'switch'`; unit tests | mobile | unit tests (FR-4, FR-5) | `feat(workouts): decide how a routine starts while another is active` |
| 4 | [ ] `useRoutineStart` hook + `ActionSheet` in `RoutinesListScreen` and `RoutineDetailScreen` (both names, save/discard message, finish-and-start / back / cancel); labels ("Start workout" for other routines, `resumeWorkout`/`resumeHint` keys removed); `ActiveWorkoutScreen` handles `action=switch&nextRoutineId`: discard or `finishWorkout` without the summary, then start the next routine; on failure stays with the finish error and scrolls to it; i18n en/es | mobile | typecheck + tests; web preview: AC-2, AC-3, FR-5 (own routine opens without asking), EF-1 (local API stopped → Torso A stays with the error) | `feat(workouts): finish the active workout and start another` |
| 5 | [ ] Active screen `ScrollView`: `automaticallyAdjustKeyboardInsets`, `keyboardShouldPersistTaps="handled"`, `keyboardDismissMode="interactive"`; notes `maxHeight` | mobile | typecheck; **iOS device (owner's batch): AC-4** | `fix(workouts): keep active workout fields above the keyboard` |
| 6 | [ ] Roadmap 01 checklist and log; backlog; one line in retro-spec 0004 that 0019 supersedes the redirect; spec status | docs | links resolve | `docs(sdd): close spec 0019 implementation` |

Not verifiable in CI: task 5 (AC-4) needs the owner's iOS device. The
bar's look on the device (tasks 2 and 4) goes in the same batch. No rebuild
or redeploy: a Metro reload is enough.

### Acceptance criteria → tasks

| AC | Task | How |
|---|---|---|
| AC-1 | 2 | Web preview |
| AC-2 | 3, 4 | `resolveSwitchOutcome` test + web preview |
| AC-3 | 3, 4 | `resolveSwitchOutcome` test + web preview |
| AC-4 | 5 | iOS device |

FR-1's rest-countdown clause is deferred to 0018 (plan, Risks); 0018's tasks
must add it to `WorkoutBar`.

## Progress log

- 2026-10-16 — Tasks written and self-approved under the owner's delegation.
- 2026-10-16 — Task 1: plan and tasks committed on `feat/sdd-0019`.
- 2026-10-16 — Task 2: `npx expo install` picked bottom-tabs 7.21.0 (latest,
  not the SDK's) and moved expo-router's own copy onto it with unmet peers;
  reverted and pinned `7.15.5` exactly with `pnpm add`, so app and
  expo-router share one copy (checked in `node_modules/.pnpm`). `WorkoutBar`
  in the tabs' `tabBar` and under the history detail and summary routes; the
  Routines card and its `resumeHint` key removed. Web preview: the bar shows
  on Routines and History above the tab bar, the clock ticks (0:10 → 0:12),
  tapping opens `/workouts/active` (AC-1).
- 2026-10-16 — Task 3: `resolveRoutineStart` and `resolveSwitchOutcome` (built
  on `countWorkoutSets`) next to `resolveActiveWorkoutEntry`;
  `parseWorkoutAction` accepts `switch`. 6 new unit tests.

## Definition of done

- [ ] Every functional requirement and acceptance criterion in `spec.md` is met
      or explicitly deferred with a TODO (FR-1 rest → 0018; Android keyboard)
- [ ] `pnpm -r typecheck` and `pnpm -r test` green
- [ ] `docs/roadmap/01-live-workout-logging.md` updated
- [ ] `spec.md` status set to `done`; `../backlog.md` updated
- [ ] AC-4 checked on the owner's iOS device
