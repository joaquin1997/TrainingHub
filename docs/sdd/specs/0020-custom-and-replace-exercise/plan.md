---
spec: 0020
status: approved     # self-approved under the delegated gates, 2026-10-16
created: 2026-10-16
---

# Plan — Create and replace exercises where they are needed

Mobile only. No contract, schema or API change: `POST /exercises` and
`GET /muscle-groups` already exist and are used today by the routine editor.

## Constitution check

| Article | Engaged? | Compliance |
|---|---|---|
| 1 — Scope control | yes | Creating (three entry points) and replacing (workout + routine editor). No editing or deleting custom exercises, no privacy (0015), no image (0026). The routine editor keeps its inline search; it is not rebuilt around the modal picker. |
| 2 — Template vs performed | yes | Two separate helpers: one replaces in the active workout draft (performed), one in the routine editor's rows (template). They share no type. Replacing in a routine only edits the template sent on save; saved `WorkoutSession`s are untouched. |
| 3 — Shared domain types | yes | Uses `Exercise` from `packages/domain`. Nothing new is shared. Pre-existing: the create body is typed separately in `exercisesClient.ts` and the API repository (see Risks); not widened here. |
| 4 — Weight in kg | yes | The replacement drops the old exercise's weights and weight placeholders; the new exercise's last-time weights come in through the existing `applyLastPerformance` (kg → session unit). No new weight is stored or formatted. |
| 5 — Prisma migrations | no | |
| 6 — Integrations behind interfaces | no | |
| 7 — Secrets | no | |
| 8 — Committable + verified | yes | Five code commits, each green on `pnpm -r typecheck` and `pnpm -r test`. |
| 9 — Dependencies | no | None added. |
| 10 — TODOs over half-solutions | yes | No unknown step. The iOS look of the create form inside the picker sheet is a device check, listed in Risks. |

## Current state (verified in the code)

- **Create.** `CustomExerciseModal` (`features/routines/components/`) is a
  centred modal: name, primary muscle groups (≥ 1), secondary ones; it calls
  `exercisesClient.create` and hands back the new `Exercise`. Its only caller
  is `RoutineFormScreen`, where the button appears under a row's inline search
  **only when no exercise matches** (`matchingExercises.length === 0`).
- **Exercises tab.** `ExercisesListScreen` renders `ScreenTitle` with no
  action. `ScreenTitle` already supports an `action` pill (used for "create"
  on other tabs).
- **Workout picker.** `ExercisePickerModal` is a `pageSheet` modal with a
  search box and up to 50 rows; tap → `onSelect` + `onClose`. It loads the
  catalog once per mount. Used only by `ActiveWorkoutScreen` ("Add
  exercise"), which appends through `addExerciseToWorkout`.
- **Active workout.** `WorkoutExerciseDraft` holds `restSeconds`,
  `supersetGroup`, `routineExerciseId` and `entries` (sets with `type`,
  `done`, typed `reps`/`weightKg`, ghosted placeholders, routine targets).
  When the set of `exerciseId`s changes, an effect fetches each exercise's
  last performance and seeds placeholders with `applyLastPerformance`; the
  "prev" column reads `lastByExercise[exerciseId]`. A card's actions are
  "Add set" and "Remove exercise". Nothing replaces an exercise.
- **Routine editor.** Each row has `exerciseId`, `exerciseQuery`,
  `restSeconds`, `supersetGroup` and `sets`. Re-typing the search and picking
  another exercise already swaps the exercise and keeps the rest — but only
  by clearing the name first, which nobody discovers.
- **Modals.** `ActionSheet` is a plain `Modal`. Opening one modal from
  another modal's closing action is unreliable on iOS (a presentation while
  another is dismissing can be dropped), and there is no precedent in the app.

## Approach

### 1. One create form, three entry points (FR-1, FR-2)

- `CustomExerciseModal`'s body becomes `CustomExerciseForm`
  (`features/exercises/components/`): `initialName`, `onCreated`, `onCancel`.
  The modal moves to the same folder and just wraps the form. One form keeps
  0026 (image) to a single place.
- **Exercises tab:** `ScreenTitle` gets a "New" action that opens the modal,
  prefilled with the search. On creation the exercise is added to the list,
  the filters are cleared and the search is set to its name, so it is in
  view (AC-1).
- **Workout picker:** a "Create exercise" row sits under the search box at
  all times; with text it reads `Create "Landmine"`. It swaps the picker's
  content to the form, inside the same modal (no modal over a modal). On
  creation the exercise joins the picker's list and is chosen like a tap on
  a row (AC-2).
- **Routine editor:** the inline "Create custom exercise" button shows for
  any typed search, under the matches, not only when nothing matches.

### 2. Replace in the active workout (FR-3, FR-5, EF-1)

- **Pure helper** `replaceExerciseInWorkout(draft, workoutExerciseId,
  exercise, doneSets: 'keep' | 'drop')` in
  `features/workouts/utils/replaceExercise.ts`, with `countDoneSets`:
  - The replacement takes the old exercise's place and its slot settings
    (`restSeconds`, `supersetGroup`, anything else on the exercise) via spread,
    with a fresh id, the new `exerciseId`/name and no `routineExerciseId`.
  - Its sets are rebuilt explicitly (not spread): same count and `type`,
    routine rep range (`minReps`/`maxReps`) kept with the reps placeholder
    derived from it, everything typed or ghosted from the old exercise
    cleared (`reps`, `weightKg`, `weightPlaceholder`, `targetWeight`, `done`,
    `restSeconds`). The existing last-performance effect then sees a new
    `exerciseId` and seeds the new exercise's own last-time values.
  - `'drop'`: the old exercise disappears; the replacement mirrors all its
    sets.
  - `'keep'` (only meaningful with done sets): the old exercise stays at its
    position with only its done sets; the replacement goes right after it
    with the sets not yet done — or all of them when every set was done.
- **Flow.** A "Replace" button joins "Add set" / "Remove exercise" on each
  card. It opens the existing picker in replace mode (title "Replace
  exercise"). Choosing an exercise with no done sets replaces at once. With
  done sets, the picker shows a confirmation step inside the same modal:
  "Keep the N done sets as their own exercise" (first, primary — the spec's
  default), "Drop the done sets" (destructive), and back. The state lives in
  a hook, `useExerciseReplacement` (`features/workouts/hooks/`), which reads
  and writes the draft through the store; the screen only adds the button,
  calls the hook, and passes its props to the picker it already renders.
- **Picker additions** (generic, not workout-specific): optional `title`,
  and optional `confirm(exercise)` returning `{ title, message, actions }` or
  `null`.

### 3. Replace in the routine editor (FR-4, FR-5)

A "Replace" button on each row that has an exercise opens
`ExercisePickerModal` (title "Replace exercise", create included). The choice
goes through a pure `replaceRoutineRowExercise(rows, rowId, exercise)`
(`features/routines/utils/replaceRoutineExercise.ts`): it sets the row's
`exerciseId` and name and keeps `sets`, `restSeconds`, `supersetGroup` and
position. The existing inline `selectExercise` uses the same helper.

### Alternatives considered

- **Ask EF-1 in an `ActionSheet` after the picker closes (or before it
  opens).** Chains two modals; on iOS the second can fail to present.
  Rejected for the in-picker step.
- **`Alert.alert` with three buttons.** Works on native, but web's `confirm`
  has two buttons, so web would need a second implementation. Rejected.
- **A nested `CustomExerciseModal` over the picker.** Same chaining risk;
  the inline step is simpler. Rejected.
- **Replacement keeps the same exercise id and set ids.** Fewer changes, but
  with `'keep'` and every set done the kept part and the replacement would
  share set ids. Fresh ids instead.
- **Replacement always gets every set, even with `'keep'`.** Literal FR-3,
  but after logging 1 of 3 on leg press you would get 3 more on hack squat.
  Rejected: the remaining sets are what is left to do.
  **[ASSUMPTION: with "keep", the replacement gets the sets not yet done;
  when all were done, it gets the same number again.]**
- **Rebuild the routine editor around the modal picker.** Larger change,
  not asked for. Rejected (Article 1).
- **A second picker instance for replace in the workout screen.** Two
  catalog caches; a custom exercise created in one would be missing from the
  other. Rejected for one picker with a mode.

## Shared contracts (`packages/domain`)

None.

## Data model and migrations

None.

- Migration name: —
- Backfill / data migration needed: no

## API surface (`apps/api`)

None.

## Mobile surface (`apps/mobile`)

- `CustomExerciseForm` (new), `CustomExerciseModal` (moved).
- `ExercisePickerModal`: create step, `title`, `confirm` step.
- `ExercisesListScreen`: "New" action.
- `RoutineFormScreen`: create always offered, "Replace" per row.
- `ActiveWorkoutScreen`: "Replace" per card, picker props from
  `useExerciseReplacement`.
- i18n en/es.
- **No native rebuild**: no dependency, no `app.json` change.

## Testing strategy

Unit tests (vitest) for both pure helpers:

- `replaceExerciseInWorkout`: position and superset kept; set count and types
  kept; typed values, done flags and old placeholders cleared; rep range
  kept; `'drop'` removes done sets; `'keep'` leaves the old exercise with its
  done sets and puts the remaining sets right after; `'keep'` with all done
  mirrors the count; orders renumbered; unknown id → same draft.
- `replaceRoutineRowExercise`: exercise swapped; sets, rest, superset and
  position kept.

| Spec AC | Verified by |
|---|---|
| AC-1 | Web preview: Exercises → New → create → it is in the list. |
| AC-2 | Web preview: active workout → Add exercise → search "Landmine" → Create → it is added to the workout. |
| AC-3 | Unit test (3 empty sets, same position). Web preview: replace an exercise with 3 empty sets → the new one has 3 sets in place; EF-1 sheet seen with a done set. |
| AC-4 | Unit test (targets, rest kept). Web preview: routine editor → Replace → save → detail shows the new exercise with the same targets and rest. |

Device (owner's batch, Metro reload): the picker's create and confirm steps
inside the iOS page sheet, keyboard included.

## Files to touch

- `apps/mobile/src/features/exercises/components/CustomExerciseForm.tsx` — new.
- `apps/mobile/src/features/exercises/components/CustomExerciseModal.tsx` —
  moved from `features/routines/components/`, now a wrapper.
- `apps/mobile/src/features/exercises/components/ExercisePickerModal.tsx` —
  create step, `title`, `confirm`.
- `apps/mobile/src/features/exercises/screens/ExercisesListScreen.tsx` — "New".
- `apps/mobile/src/features/routines/screens/RoutineFormScreen.tsx` — import
  path, create always, "Replace" + picker.
- `apps/mobile/src/features/routines/utils/replaceRoutineExercise.ts` (+ test) — new.
- `apps/mobile/src/features/workouts/utils/replaceExercise.ts` (+ test) — new.
- `apps/mobile/src/features/workouts/hooks/useExerciseReplacement.ts` — new.
- `apps/mobile/src/features/workouts/screens/ActiveWorkoutScreen.tsx` —
  "Replace" button, hook, picker props (a few lines).
- `apps/mobile/src/i18n/locales/en.ts`, `es.ts`.
- `docs/sdd/specs/0020-custom-and-replace-exercise/*` — status, progress.

## Risks and open questions

- **Parallel edits** (0018 rest timer, 0021 timed/distance sets) touch
  `ActiveWorkoutScreen` and the set draft. The screen change is a button and
  a prop spread. The replacement's sets are built field by field on purpose:
  if 0021 adds required set fields, the merge fails typecheck instead of
  silently carrying the old exercise's typed time or distance.
- **Create body typed twice** (`exercisesClient.ts` and the API repository) —
  pre-existing; 0026 widens that body and should move it to
  `packages/domain`.
- **iOS page sheet.** The create form inside the picker relies on the
  sheet's scroll view and keyboard; checked on the owner's device.
- **`routineExerciseId` dropped on the replacement.** The saved exercise is
  not the routine's; the field is only a reference today (validated on save,
  read by nothing). **[ASSUMPTION: a replaced exercise is not linked to the
  routine slot.]**

## Rollout

Mobile only, JS only: a Metro reload or a JS update. No ordering constraint.
Roll back by reverting the commits. The active workout draft keeps its shape,
so a draft persisted before or after the update restores either way.
