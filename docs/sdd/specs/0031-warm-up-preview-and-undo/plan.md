---
spec: 0031
status: approved     # self-approved under the delegated gates, 2026-10-17
created: 2026-10-17
---

# Plan — Warm-up sets: preview, mark and undo

Three pieces on top of 0024's calculator, which does not change: (1) "last
time" paired by kind, which needs last time's sets to say whether they were
warm-ups; (2) the generated mark, the preview and the add/remove toggle in the
active workout, as pure draft helpers plus a shared preview sheet; (3) the
same in the routine editor, where the mark is stored on the routine set and
carried into a workout started from it. Everything new lives in new modules;
the shared workout files get a few lines each.

## Constitution check

| Article | Engaged? | Compliance |
|---|---|---|
| 1 — Scope control | yes | No change to the scheme, bar or rounding; no auto-recalculation; the mark is not saved with a workout, not shown in History, the routine detail, the watch or the lock screen (spec out of scope / assumptions). "Last time" pairs warm-up vs working only — drop and failure stay working sets. No undo history. |
| 2 — Template vs performed | yes | Template: `RoutineExerciseSet.isGeneratedWarmup` (new column). In progress: `WorkoutSetDraft.generatedWarmup` (device only). Performed: nothing — `toCreateWorkoutSessionInput` maps fields explicitly, so the mark never reaches `WorkoutSet` (FR-17). The mark is copied from routine to draft at start like every other target. |
| 3 — Shared domain types | yes | `isGeneratedWarmup?` on `RoutineExerciseSet` / `RoutineSetInput`, `isWarmup?` on `ExerciseLastSet`, all in `packages/domain/src/entities.ts`. Pairing, preview and toggle helpers are mobile-only logic, not contracts. |
| 4 — Weight in kg | yes | The preview shows the calculator's display-unit numbers (draft unit in the workout, `settings.unit` in the editor) — the values that will be typed into the fields, as in 0024. Saved routine targets keep going through `toKg`. Nothing non-kg is persisted. |
| 5 — Prisma migrations | yes | One additive column, `RoutineExerciseSet.isGeneratedWarmup BOOLEAN NOT NULL DEFAULT false`, migration `20261018110000_add_routine_set_generated_warmup`, SQL from `prisma migrate diff --from-schema-datamodel <old> --to-schema-datamodel <new> --script` (as 0024). No data change: existing rows are not generated (EF-6/EF-7). |
| 6 — Integrations behind interfaces | no | Watch and Live Activity untouched; they keep seeing warm-up sets. |
| 7 — Secrets | no | |
| 8 — Committable + verified | yes | Four code commits (last time by kind → workout preview/mark/toggle → routine column + API → routine editor), each green on `pnpm -r typecheck` and `pnpm -r test`. |
| 9 — Dependencies | no | None; no native rebuild (Ionicons and `Modal` already in use). |
| 10 — TODOs over half-solutions | yes | The device-only checks (sheet ergonomics, mark legibility) are a [DEVICE] task, not guessed. |

## Current state (verified in the code, 2026-10-17)

- **Calculator** `lib/approachSets.ts` → `{ weight, reps }[]` in the display
  unit. Unchanged by this plan.
- **Workout action** `features/workouts/state/approachSetsDraft.ts`:
  `addApproachSets(draft, workoutExerciseId)` inserts typed `warmup` sets
  before the first non-warm-up set, **replacing** the not-done warm-ups ahead
  of it, outcome `added | noWeight | tooLight`. `canAddApproachSets` limits
  it to weight & reps. `ActiveWorkoutScreen` shows a flame button in the
  exercise's actions row and the notice below it; no preview.
- **Routine action** `features/routines/utils/routineApproachSets.ts`:
  `addRoutineApproachSets(sets, unit, createId)` replaces **all** warm-up rows
  ahead of the first working row. `RoutineFormScreen` calls it from a flame
  button; `RoutineSetTable` labels rows `W` / 1, 2, 3 via `routineSetLabel`.
- **Draft set** (`WorkoutSetDraft`): no origin field. Value edits go through
  `updateWorkoutSetDraft`, type changes through `cycleWorkoutSetType`, both in
  `workoutDraftStore.ts`. Drafts persist as JSON (0010) with a loose shape
  check, so a new optional field loads and survives a restart.
- **Routine set**: `isWarmup` only (0024). `buildExerciseDrafts` maps it to
  `type: 'warmup'`. `duplicateRoutine.ts` copies `isWarmup`.
- **"Last time"**: `GET /workouts/exercises/:id/last` returns
  `ExerciseLastSet { order, reps, repsLeft/Right, weightKg, durationSeconds,
  distanceMeters }` — **no set type**, although `WorkoutSet` stores `type` and
  `isWarmup` (`isWarmupSet` in `performedSets.ts` reads both).
  `applyLastPerformance` (store) and `previousSetLabel` (`WorkoutSetRow.tsx`)
  both pair by `order`. `applyLastPerformance` runs once per fetch in
  `ActiveWorkoutScreen`; when last time has no set at that order the
  placeholder is left as it was (routine target or inherited value).

## Approach

### 1 — "Last time" by kind (FR-18 – FR-20, AC-10, AC-11, EF-8)

- API: `getExerciseLastPerformance` adds `isWarmup: true` to sets for which
  `isWarmupSet` holds (absent otherwise, like every optional there).
- Mobile, new `features/workouts/state/lastTimeByKind.ts`:
  - `pairLastSets(lastSets, entries)` → one `ExerciseLastSet | undefined` per
    entry: the n-th warm-up entry gets last time's n-th warm-up set (by
    `order`), the n-th working entry last time's n-th working set. A server
    that does not send `isWarmup` makes every last set a working set, so
    warm-ups show nothing and working sets still pair (EF-8).
  - `pairedPerformance(performance, entries)` → the same performance with
    the paired sets renumbered to today's `order`s, so `previousSetLabel`
    keeps its signature and only its call site changes.
  - `targetPlaceholders(set, unit)` → the placeholders a set had from its
    routine targets (as `buildExerciseDrafts` builds them).
- `applyLastPerformance` uses `pairLastSets` instead of `find(order)`. A set
  it fills is flagged `lastTimePaired`; when such a set later has no
  counterpart of its kind (its type changed, or sets were removed), its
  placeholders go back to its routine targets and the flag is cleared — so a
  borrowed value from the other kind never lingers (FR-19). Sets never
  paired keep their placeholders (routine target, or inherited from the set
  above), as today.
- `ActiveWorkoutScreen` re-applies the fetched performances whenever the
  draft changes (an effect on the draft and `lastByExercise`).
  `applyLastPerformance` returns the same reference when nothing changes, so
  this settles after one pass. That is what makes a type change re-pair
  (FR-20) and what keeps working sets right after warm-ups are inserted.

### 2 — Active workout: mark, preview, toggle

- `WorkoutSetDraft.generatedWarmup?: boolean`. `updateWorkoutSetDraft` clears
  it when the value actually changes; `cycleWorkoutSetType` clears it always
  (FR-7). `toggleWorkoutSetDone`, `completeSet`, moving and removing leave it
  alone (FR-8). Persisted with the draft (FR-16, AC-7); not sent on save
  (FR-17, AC-8).
- `approachSetsDraft.ts` is rewritten around the toggle (the old
  replace-on-add `addApproachSets` goes away with its assumption):
  - `warmUpActionFor(exercise)` → `'remove'` when any set is a not-done
    `warmup` with `generatedWarmup`, else `'add'` (FR-9, FR-11; EF-3: only
    done generated sets → add).
  - `previewApproachSets(draft, workoutExerciseId)` →
    `{ outcome: 'preview', exerciseId, sets, workingWeight, unit,
    keptWarmUps }` or `noWeight` / `tooLight` (FR-1, FR-5; EF-4 with no
    working set → `noWeight`). `keptWarmUps` = warm-up sets ahead of the
    first working set, for "they will be kept" (FR-4, AC-4).
  - `confirmApproachSets(draft, workoutExerciseId, preview)` inserts exactly
    `preview.sets` as typed `warmup` sets with `generatedWarmup: true`,
    right before the first working set (after any warm-ups already there),
    or at the end when there is no working set; removes nothing (FR-3,
    FR-4, EF-2). When the exercise is gone or its catalog exercise changed
    (replaced), it returns the draft unchanged (EF-1).
  - `removeGeneratedWarmUps(draft, workoutExerciseId)` drops every not-done
    generated warm-up of the exercise and renumbers (FR-9, FR-10, AC-5,
    AC-6).
- New `features/workouts/components/ApproachSetsPreviewSheet.tsx`: a bottom
  sheet (same pattern as `RestEditorSheet`) with the title, "From 140 kg",
  one row per set "20 kg × 10" lightest first, the kept note when
  `keptWarmUps > 0`, and Cancel / Add. Backdrop and back button cancel
  (FR-2). Shared by the workout and the routine editor.
- `ActiveWorkoutScreen`: the flame button reads the action — `flame-outline`
  with "Add warm-up sets", or a filled `flame` with a small ✕ badge and
  "Remove generated warm-up sets" (FR-12: icon shape and label, not colour).
  Add opens the sheet (preview held in component state, so a restart reopens
  without it — EF-5); an effect closes it when its exercise disappears or is
  replaced (EF-1). Remove applies at once, no preview (assumption).
- `WorkoutSetRow`: a generated set's marker gets a dashed border and a small
  `sparkles` badge, and its accessibility label becomes "Warm-up, generated"
  (FR-6). Still the warm-up letter and colour, so still a warm-up.

### 3 — Routine editor and template

- Column `RoutineExerciseSet.isGeneratedWarmup` (default false); domain
  `isGeneratedWarmup?` on `RoutineExerciseSet` and `RoutineSetInput`. The API
  stores it only when the set is also a warm-up and the value is literally
  `true`; returns it only when true (FR-14). An older app's `PUT` drops it —
  its rows become ordinary warm-ups (EF-7, accepted).
- `EditableRoutineSet.generatedWarmup?`; `toEditableSet` reads it, save sends
  it, `updateSetField` clears it when the value changes (FR-7 — the editor
  has no type toggle). `duplicateRoutine.ts` copies it (FR-14).
- `routineApproachSets.ts` mirrors the workout helpers on rows:
  `routineWarmUpActionFor(sets)` (`remove` when any generated row),
  `previewRoutineApproachSets(sets, unit)`,
  `confirmRoutineApproachSets(sets, preview, createId)` (insert before the
  first working row, after existing warm-ups, nothing replaced; rows marked),
  `removeRoutineGeneratedWarmUps(sets)` (FR-13: no "done" in a template).
  The old replace-all `addRoutineApproachSets` goes away.
- `RoutineSetTable`: generated rows show the `W` with the `sparkles` badge
  and an accessibility label (FR-6). `RoutineFormScreen`: same toggle button
  and preview sheet; confirm applies to the row's current sets, and does
  nothing when the row is gone or its exercise changed (EF-1).
- `buildExerciseDrafts` sets `generatedWarmup` on a draft set from a routine
  set that is a warm-up and generated (FR-15, AC-9). Then it removes and
  re-adds from today's weight like any generated set.
- Routine detail: unchanged — generated rows read as warm-ups (assumption).

### Alternatives considered

- **A new set type "generated warm-up".** Would ripple into the API's set
  types, records, volume, History and the watch, all of which must treat it
  exactly as a warm-up (spec: "a property of a warm-up set, not a new set
  type"). Rejected for a flag.
- **Remember generated set ids in a side list on the draft** (instead of a
  field on the set). Keeps `WorkoutSetDraft` untouched, but every edit path
  (value, type, remove, replace) would have to keep the list in sync from
  outside the store. Rejected: a field cleared at the two edit points is
  simpler and survives persistence for free.
- **Compare a generated set's values with what was generated** to decide if
  it was edited. Typing a value and back would restore the mark, and the
  original values would have to be stored anyway. Rejected: "loses the mark
  for good" (FR-7) is a flag cleared on change.
- **Pair "last time" on the server** (return sets already split by kind).
  The pairing depends on today's sets, which only the phone knows. Rejected;
  the server only adds `isWarmup`.
- **Change `previousSetLabel` to take a paired set.** Touches the shared row
  component's API for no gain; renumbering the performance keeps the
  function as is. Rejected.
- **Keep `applyLastPerformance` fetch-only and re-pair only on type change.**
  Insertions and removals shift positions within a kind too; a single
  re-apply on every draft change covers all of them, and the function is
  already reference-stable. Rejected.

## Shared contracts (`packages/domain`)

```ts
// RoutineExerciseSet and RoutineSetInput gain:
  /** Added by the warm-up action and not changed since (spec 0031); only with isWarmup. */
  isGeneratedWarmup?: boolean;

// ExerciseLastSet gains:
  /** Last time's set was a warm-up (spec 0031): "last time" pairs by kind. */
  isWarmup?: boolean;
```

Additive and optional. An older server sends neither: the editor shows no
mark (EF-7) and every last set is a working set (EF-8). An older app ignores
both.

## Data model and migrations

```prisma
model RoutineExerciseSet {
  …
  /// Added by the warm-up action and untouched since (spec 0031).
  isGeneratedWarmup Boolean @default(false)
}
```

- Migration name: `20261018110000_add_routine_set_generated_warmup`
- Backfill / data migration needed: no — existing rows are not generated.

## API surface (`apps/api`)

- `GET /routines`, `GET /routines/:id` — sets carry `isGeneratedWarmup: true`
  when stored.
- `POST /routines`, `PUT /routines/:id` — accept `sets[].isGeneratedWarmup`;
  only a literal `true` on a set that is also `isWarmup: true` is stored.
  No new error.
- `GET /workouts/exercises/:exerciseId/last` — sets carry `isWarmup: true`
  for warm-ups.

## Mobile surface (`apps/mobile`)

- `features/workouts/state/lastTimeByKind.ts` (+ test) — new.
- `features/workouts/state/approachSetsDraft.ts` (+ test) — rewritten.
- `features/workouts/components/ApproachSetsPreviewSheet.tsx` — new.
- `features/workouts/state/workoutDraftStore.ts` — two optional fields; mark
  cleared in two functions; mark carried in `buildExerciseDrafts`;
  `applyLastPerformance` pairs by kind.
- `features/workouts/components/WorkoutSetRow.tsx` — marker mark.
- `features/workouts/screens/ActiveWorkoutScreen.tsx` — toggle, sheet,
  re-apply effect, paired previous label.
- `features/routines/utils/routineApproachSets.ts` (+ test) — rewritten
  around the toggle; `duplicateRoutine.ts` (+ test).
- `features/routines/components/RoutineSetTable.tsx` — mark.
- `features/routines/screens/RoutineFormScreen.tsx` — toggle, sheet, mark
  load/save/clear.
- i18n en/es.
- No native rebuild; Metro reload.

## Testing strategy

| Spec AC | Verified by |
|---|---|
| AC-1 | `approachSetsDraft.test.ts`: preview for 140 kg lists the five sets "from 140" and the draft is the same reference. |
| AC-2 | Cancel is not calling confirm: the preview leaves the draft untouched (same test); device for the sheet. |
| AC-3 | `approachSetsDraft.test.ts`: confirm inserts five `warmup` sets with `generatedWarmup` before the working set; action becomes `remove`. Device for the visual mark. |
| AC-4 | `approachSetsDraft.test.ts`: hand-typed warm-up kept on confirm and on remove; `keptWarmUps: 1`. |
| AC-5 | `approachSetsDraft.test.ts`: two done + three not done → remove leaves the two done, still marked; action then `add`. |
| AC-6 | `workoutDraftStore` path via `updateWorkoutSetDraft` in `approachSetsDraft.test.ts`: edit clears the mark, remove leaves it; same for `cycleWorkoutSetType`; tick keeps it. |
| AC-7 | `approachSetsDraft.test.ts`: the draft round-trips through JSON with the mark. Device for a real restart. |
| AC-8 | `approachSetsDraft.test.ts`: `toCreateWorkoutSessionInput` sends `type: 'warmup'`, `isWarmup: true`, no mark. |
| AC-9 | Route test (`isGeneratedWarmup` stored only with `isWarmup`, returned); `routineApproachSets.test.ts` (preview/confirm/remove rows); `duplicateRoutine.test.ts`; draft-from-routine test (generated routine set → generated draft set). Device for reopening. |
| AC-10 | `lastTimeByKind.test.ts` and an `applyLastPerformance` test: 2 warm-ups + 3 working last time vs 5 + 3 today. |
| AC-11 | `lastTimeByKind.test.ts`: last time's first set a 20 kg warm-up → today's first working set pairs with last time's first working set. |
| AC-12 | `approachSetsDraft.test.ts`: lb draft → preview in lb (45 bar, multiples of 5). |
| FR-19 / FR-20 | `applyLastPerformance` test: a working set switched to warm-up with no warm-up last time drops back to its routine target. |
| EF-1 | confirm after removal / replacement → draft unchanged (both helpers). |
| EF-3, EF-4 | action `add` with only done generated sets; remove with no working set; preview `noWeight` with no working set. |
| EF-6 | unmarked warm-ups (0024 drafts) are kept by remove. |
| EF-8 | `lastTimeByKind.test.ts`: last sets without `isWarmup` → warm-ups unpaired, working sets paired. |

## Files to touch

- `packages/domain/src/entities.ts`
- `apps/api/prisma/schema.prisma`; `apps/api/prisma/migrations/20261018110000_add_routine_set_generated_warmup/`
- `apps/api/src/features/routines/routes.ts`, `repository.ts`, `routes.test.ts`
- `apps/api/src/features/workouts/repository.ts` (last performance `isWarmup`)
- `apps/mobile/src/features/workouts/state/lastTimeByKind.ts` (+ test) — new
- `apps/mobile/src/features/workouts/state/approachSetsDraft.ts` (+ test)
- `apps/mobile/src/features/workouts/state/workoutDraftStore.ts`
- `apps/mobile/src/features/workouts/components/ApproachSetsPreviewSheet.tsx` — new
- `apps/mobile/src/features/workouts/components/WorkoutSetRow.tsx`
- `apps/mobile/src/features/workouts/screens/ActiveWorkoutScreen.tsx`
- `apps/mobile/src/features/routines/utils/routineApproachSets.ts` (+ test), `duplicateRoutine.ts` (+ test)
- `apps/mobile/src/features/routines/components/RoutineSetTable.tsx`
- `apps/mobile/src/features/routines/screens/RoutineFormScreen.tsx`
- `apps/mobile/src/i18n/locales/en.ts`, `es.ts`
- `docs/sdd/specs/0031-warm-up-preview-and-undo/*`; `docs/sdd/specs/0024-warm-up-sets/spec.md` (superseded assumption). Backlog, roadmap 01 and the glossary term go to the coordinator.

## Risks and open questions

- **Parallel work on the same files.** 0029 (supersets) and 0032 (live
  records) edit `ActiveWorkoutScreen`, `WorkoutSetRow` and the draft store.
  This plan keeps logic in new modules and touches those files in small,
  local hunks (types, two clear-on-edit lines, the pairing line, the marker,
  the button handler, one effect). Conflicts are expected to be textual and
  small.
- **Re-applying last time on every draft change** now also fills sets added
  with "Add set" from last time's set of the same kind and position when
  there is one (before, they kept the value inherited from the set above).
  That is what FR-18 asks; noted for the device pass.
- **A routine set's target placeholders** are the fallback when a paired set
  loses its counterpart. A set added during the workout has no targets, so
  it falls back to empty placeholders — acceptable, it shows "–" rather than
  the other kind's value (FR-19).
- **The routine editor's inheritance** (0024) already skips the other kind;
  generated rows have typed values, so nothing changes there.

## Rollout

Migration first, then the API, then the app. The column is additive with a
default. An older app ignores `isGeneratedWarmup` and drops it on its routine
saves (EF-7). A newer app on an older API: no mark in saved routines (rows
come back as plain warm-ups) and "last time" treats every set as working —
warm-ups show no last time, working sets pair as before warm-ups existed.
No native rebuild. Roll back by reverting; the column can stay.
