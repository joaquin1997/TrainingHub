---
spec: 0019
status: approved     # self-approved under the delegated gates, 2026-10-16
created: 2026-10-16
---

# Plan — The workout in progress is always at hand

Mobile only. No contract, schema or API change.

## Constitution check

| Article | Engaged? | Compliance |
|---|---|---|
| 1 — Scope control | yes | Bar, switch question, keyboard. No second active workout, no editing of finished workouts. The rest countdown in the bar waits for 0018 (see Risks) instead of being built here. |
| 2 — Template vs performed | yes | "Finish and start" saves the `WorkoutSession` through the existing finish path and reads the next `Routine` through the existing start path. No new type serves both. |
| 3 — Shared domain types | no | Nothing in `packages/domain` changes. |
| 4 — Weight in kg | no | The bar shows no weight. The save goes through the existing `toCreateWorkoutSessionInput`. |
| 5 — Prisma migrations | no | |
| 6 — Integrations behind interfaces | yes | "Finish and start" reuses the existing finish code, which already reaches Apple Health through `syncWorkoutCompletionToAppleHealth`. No new provider code. |
| 7 — Secrets | no | |
| 8 — Committable + verified | yes | Three code commits (bar → switch → keyboard), each green on `pnpm -r typecheck` and `pnpm -r test`. |
| 9 — Dependencies | yes | Adds `@react-navigation/bottom-tabs` as a **direct** dependency of `apps/mobile`. It is JS-only, already installed (expo-router depends on it, 7.15.5) and needs no rebuild. See "Tab bar slot". |
| 10 — TODOs over half-solutions | yes | Two TODOs: the bar's rest countdown (0018) and the Android keyboard check. Both are listed in Risks. |

## Current state (verified in the code)

- **Navigation.** The root `Stack` (`src/app/_layout.tsx`) holds `(tabs)`,
  `auth`, `workouts/active`, `workouts/summary` and `workouts/[workoutId]`.
  The five tabs (`src/app/(tabs)/_layout.tsx`) use the default tab bar.
  Routines, Exercises and Progress have nested stacks. The active workout is
  a root-stack screen above the tabs, so the tab bar is never visible behind
  it.
- **Way back to the workout.** The only way is the "workout in progress" card
  at the top of `RoutinesListScreen` (lines ~153–181), plus the Start buttons.
- **Starting another routine.** `RoutinesListScreen.startTarget` and the
  Start button in `RoutineDetailScreen` (line ~322) quietly swap the target to
  `activeWorkout.routineId`. The label then reads "Resume active workout".
  `resolveActiveWorkoutEntry` and `startActiveWorkout` would also ignore a
  different routine while one is active. Today, nothing can replace an
  active workout except finishing or discarding it.
- **Finish.** `ActiveWorkoutScreen.finishWorkout` (lines 279–308) refuses with
  `markOneSet` when no set is done. Otherwise it `POST`s through
  `workoutsClient.create(toCreateWorkoutSessionInput(draft))`, then runs
  `saveCompletedWorkout`, `clearActiveWorkout` and the Health sync, then
  replaces to the summary. On failure it sets `finishError` and
  `finishRefused` (0014 EF-5). Both show just above the Finish button, at the
  bottom of the scroll.
- **Link actions.** `parseWorkoutAction` already turns `?action=finish`
  (0012, lock screen) into a confirmed finish on the active screen. `finishRef`
  is how the effect reaches the handler.
- **Rest countdown.** It is `useRestTimer` state local to
  `ActiveWorkoutScreen`, so it dies when the screen unmounts. Nothing outside
  that screen can read it. Spec 0018 moves it into the active workout.
- **Keyboard.** The active screen is one plain `ScrollView` with no keyboard
  handling. Notes is a `multiline` `TextInput` with `minHeight: 72` and no
  max height. React Native 0.83 has `automaticallyAdjustKeyboardInsets` on
  iOS (verified in `RCTScrollViewComponentView.mm`). When the keyboard frame
  changes, it adds the keyboard height as bottom inset and scrolls the
  focused input above the keyboard. Android uses Expo's default
  `softwareKeyboardLayoutMode` (no override in `app.json`).
- **Confirmations.** `ActionSheet` (`src/ui/ActionSheet.tsx`) takes a title,
  a message and N actions, and adds its own Cancel row. It works on web.
  `confirmAction` only offers two choices.

## Approach

Three independent pieces.

### 1. Workout bar (FR-1, FR-2, EF-2)

A `WorkoutBar` component reads `useActiveWorkout()` and renders nothing when
no workout is active. When one is active it shows:

- a live dot, using the paused style when paused
- the routine name
- the clock from `useElapsedSeconds`, frozen while paused
- a chevron

Tapping it runs `router.push('/workouts/active')`. With no `routineId`,
`resolveActiveWorkoutEntry` resumes, offline too.

The bar goes in two places, always in the layout flow, never absolutely
positioned. Screens therefore shrink to make room for it, and it cannot
cover the last list item or the tab bar (EF-2):

- **Tab bar slot.** `Tabs` gets
  `tabBar={(props) => <><WorkoutBar /><BottomTabBar {...props} /></>}`.
  `BottomTabView` lays the tab bar out after the screen container in a flex
  column (verified in `@react-navigation/bottom-tabs` 7.15.5). The bar sits
  just above the tabs, and every tab screen, including nested-stack screens,
  is shortened by its height.
- **Root-stack screens outside the tabs.** The `workouts/[workoutId]` and
  `workouts/summary` route files wrap their screen in a flex column with
  `<WorkoutBar />` below it, padded by the bottom safe-area inset. The
  summary normally appears after a finish, so the bar there is usually
  hidden. It is included so that "every screen" holds.

The active workout screen has no bar, because it is not under the tabs and
its route file adds none. The auth screen has none either: it only appears
when nobody is signed in.

The Routines card is removed. With the bar on the Routines tab it would be a
second "back to the workout" on the same screen. **[ASSUMPTION: the bar
replaces the card.]**

### 2. Starting a routine while another is active (FR-3, FR-4, FR-5, EF-1)

- **Pure decision.** `resolveRoutineStart(activeWorkout, routineId)` returns
  one of three values:
  - `'start'`: no active workout.
  - `'open'`: the routine is the active one's (FR-5).
  - `'ask'`: another workout is active.

  `resolveSwitchOutcome(activeWorkout)` returns `'save'` when at least one
  set is done and `'discard'` otherwise (FR-4). Both live next to
  `resolveActiveWorkoutEntry` and are unit-tested.
- **The question.** A small hook, `useRoutineStart()`, gives the routines
  list and routine detail one `startRoutine(routine)` and the props for an
  `ActionSheet`. The sheet names both workouts (FR-3):
  - Title: "Workout in progress".
  - Message (save case): "Torso A has 3 sets done; finishing saves it."
  - Message (discard case): "Torso A has no sets done; finishing discards it."
  - Action: "Finish Torso A and start Pierna A". It is destructive in the
    discard case.
  - Action: "Back to Torso A".
  - Cancel: built into the sheet.
- **The execution happens on the active workout screen.** "Finish and start"
  navigates to
  `/workouts/active?action=switch&nextRoutineId=<id>`.
  `parseWorkoutAction` learns `'switch'`. As with `finish`, an effect clears
  the params and then does one of two things:
  - `'discard'`: `clearActiveWorkout()`.
  - `'save'`: calls `finishWorkout({ then: 'start-next' })`, the same handler
    as the button. On success it does not go to the summary (spec
    assumption).

  Then the screen sets `routineId = nextRoutineId` and goes to `loading`.
  The existing fetch-and-start effect starts the new routine. **On failure
  the old workout stays on screen with `finishError` / `finishRefused`,
  exactly as on finish (EF-1).** The screen then scrolls to the end so the
  error is visible, because the person arrived at the top.
- **Labels.** A different routine's button now reads "Start workout",
  because it asks. The active routine's button keeps "Continue workout". The
  `routines.resumeWorkout` and `routines.resumeHint` keys go away.

### 3. Fields above the keyboard (FR-6)

The active screen's `ScrollView` gets:

- `automaticallyAdjustKeyboardInsets` (iOS)
- `keyboardShouldPersistTaps="handled"`, so tapping ✓ or another field
  while typing works on the first tap
- `keyboardDismissMode="interactive"`

Notes gets a `maxHeight` (about 160). Past that height it scrolls inside
itself, and UIKit keeps the caret visible. The field itself was brought above
the keyboard when it got focus. That covers long notes without tracking
content size.

### Alternatives considered

- **One bar in the root layout, under the whole `Stack`.** On tab screens it
  would sit below the tab bar, in the home-indicator area, with the tab bar's
  own inset leaving a gap above it. Rejected for placement. Absolute
  positioning over the screens was also rejected, because it breaks EF-2.
- **A bar inside each tab (three stack layouts + History + Settings) instead
  of the tab-bar slot.** This needs no dependency, but it means five
  placements to keep in sync, and each new tab must remember it. Every
  mounted tab would also run its own one-second clock. Rejected. It is the
  fallback if the direct dependency ever causes trouble.
- **Run "finish and start" from the routines screens.** EF-1 would then need
  the finish error moved into a store, or a second way of showing it. Doing
  it on the active screen reuses the finish UI as it is. Rejected.
- **`confirmAction` for the question.** It offers only two choices; FR-3
  needs three. Rejected.
- **`react-native-keyboard-controller`.** It is reliable on both platforms,
  but it is a native module and needs a rebuild. iOS is already covered by
  the built-in prop. Kept as the fallback if the device check fails
  (Article 9).
- **Building the rest countdown into the bar now.** That would mean moving
  the rest timer out of the screen, which is 0018's core change. Rejected
  (Article 1). 0018 adds it to the bar.

## Shared contracts (`packages/domain`)

None.

## Data model and migrations

None.

- Migration name: —
- Backfill / data migration needed: no

## API surface (`apps/api`)

None. "Finish and start" uses the existing `POST /workouts`, which is already
idempotent by workout identity (0014).

## Mobile surface (`apps/mobile`)

- New `WorkoutBar`, mounted in the tab bar slot and under the two root-stack
  workout routes.
- New `useRoutineStart` hook and the switch sheet, in `RoutinesListScreen`
  and `RoutineDetailScreen`. The Routines active card is removed.
- `ActiveWorkoutScreen`:
  - the `switch` link action
  - a finish mode that starts the next routine instead of showing the summary
  - scroll-to-error
  - keyboard props
  - notes `maxHeight`
- New i18n keys (ES/EN): bar accessibility label, sheet title, messages and
  actions.
- **No native rebuild.** The new dependency is JS-only and already in the
  tree. No `app.json` change.

## Testing strategy

Unit tests (vitest, pure helpers):

- `resolveRoutineStart`:
  - no active workout → start
  - same routine → open
  - other routine → ask
- `resolveSwitchOutcome`:
  - 0 done → discard
  - ≥ 1 done → save
- `parseWorkoutAction('switch')`.

The bar, the sheet and both switch outcomes are checked on the local web
preview (web + local API on PGlite). The keyboard can only be checked on an
iOS device or simulator.

| Spec AC | Verified by |
|---|---|
| AC-1 | Web preview: start a workout, open History. The bar shows the routine and a ticking clock, sitting above the tab bar with the last history row reachable. Tap opens the workout. Same on a history detail. |
| AC-2 | `resolveSwitchOutcome` test (0 done → discard). Web preview: Torso A with nothing done, Start on Pierna A, "finish and start". Pierna A is active and History has no Torso A. |
| AC-3 | `resolveSwitchOutcome` test (≥ 1 → save). Web preview: 3 sets done, same action. History shows Torso A with 3 sets, Pierna A is active, and no summary was shown. EF-1 is checked by stopping the local API before the action: Torso A stays, with the save error visible. |
| AC-4 | Owner's device batch (iOS): type long notes and edit a weight on the last exercise with the keyboard open. The text stays visible. |

## Files to touch

- `apps/mobile/package.json`, `pnpm-lock.yaml`: add
  `@react-navigation/bottom-tabs` (installed with `npx expo install` so the
  version matches expo-router's).
- `apps/mobile/src/features/workouts/components/WorkoutBar.tsx`: new.
- `apps/mobile/src/app/(tabs)/_layout.tsx`: `tabBar` with the bar above
  `BottomTabBar`.
- `apps/mobile/src/app/workouts/[workoutId].tsx`,
  `apps/mobile/src/app/workouts/summary.tsx`: bar under the screen.
- `apps/mobile/src/features/workouts/utils/activeWorkoutEntry.ts` (+ `.test.ts`):
  `resolveRoutineStart`, `resolveSwitchOutcome`.
- `apps/mobile/src/features/workouts/utils/workoutAction.ts` (+ `.test.ts`):
  `'switch'`.
- `apps/mobile/src/features/workouts/hooks/useRoutineStart.ts`: new.
- `apps/mobile/src/features/routines/screens/RoutinesListScreen.tsx`: hook +
  sheet, labels, active card removed.
- `apps/mobile/src/features/routines/screens/RoutineDetailScreen.tsx`: hook +
  sheet, labels.
- `apps/mobile/src/features/workouts/screens/ActiveWorkoutScreen.tsx`: switch
  action, finish mode, scroll-to-error, keyboard props, notes `maxHeight`.
- `apps/mobile/src/i18n/locales/en.ts`, `es.ts`: new keys; `resumeWorkout`
  and `resumeHint` removed.
- `docs/sdd/backlog.md`, `docs/roadmap/01-live-workout-logging.md`: status.
- `docs/sdd/specs/0004-retro-routines/spec.md`: one line noting that the
  redirect to the active workout is superseded by 0019 (as the spec's
  "Related" says).

## Risks and open questions

- `TODO(sdd): the bar's rest countdown (FR-1, last clause) — unblocked by 0018,
  which puts the running rest in the active workout; 0018's plan adds it to
  WorkoutBar.` Until then a rest dies when the workout screen is left, so the
  bar has no running rest to show. FR-1 is met except for that clause.
- `TODO(sdd): Android keyboard behaviour for FR-6 is unverified — Expo SDK 55
  is edge-to-edge on Android, where window resizing for the keyboard may not
  happen; needs a check on an Android device or emulator, fallback
  react-native-keyboard-controller.` iOS is the target, and the owner tests
  on iOS.
- **Direct dependency drift.** If `@react-navigation/bottom-tabs` in
  `apps/mobile` ever resolves to a different copy than expo-router's, the
  tab bar could read the wrong navigation context. Installing and upgrading
  with `npx expo install` (and `expo install --check` on SDK upgrades) keeps
  them aligned. The fallback is the per-tab placement above.
- **The new routine fails to load after the old one was saved.** The old
  workout is safely in History, and the screen shows the existing "could not
  load the routine" state with a way back to Routines, from where Start
  works again. This is acceptable and not a new failure mode.
- **Modals** (exercise picker, action sheets) cover the bar while open. They
  are overlays, not screens, so this is accepted.

## Rollout

Mobile only. No API or schema change, so there is no ordering constraint and
older bundles are unaffected. No native rebuild: a Metro reload or a JS
update is enough. To roll back, revert the commits. Nothing is persisted in
a new shape: the active workout draft is unchanged.
