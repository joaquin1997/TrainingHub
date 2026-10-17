---
spec: 0024
status: approved     # self-approved under the delegated gates, 2026-10-17
created: 2026-10-17
---

# Plan — Warm-up sets

Two slices, calculator first (the owner's order). The calculator is a pure
function on the device that writes ordinary warm-up sets: into the active
workout draft, or into the routine editor, where routine sets learn to be
warm-ups. The warm-up block is a new ordered list on the routine (template)
and a separate list of done items on the saved workout (performed).

## Constitution check

| Article | Engaged? | Compliance |
|---|---|---|
| 1 — Scope control | yes | One fixed scheme (spec assumption), one bar weight per unit, rounding to one loadable step. No plate calculator, no configurable scheme or bar (out of scope / follow-up). Approach sets only for weight & reps exercises. The warm-up block is a checklist: name + optional time or reps target, ticked, nothing else — no timer, no logging. |
| 2 — Template vs performed | yes | Template: `RoutineExerciseSet.isWarmup` and a new `RoutineWarmUpItem` table / `RoutineWarmUpItem` type. Performed: warm-up sets are `WorkoutSet` rows typed `warmup` (as today) and the done checklist is a new `WorkoutWarmUpItem` table / type. The two warm-up item types and tables share nothing; a workout copies the names and targets, so editing the routine never rewrites a saved workout. |
| 3 — Shared domain types | yes | `RoutineWarmUpItem(Input)`, `WorkoutWarmUpItem(Input)`, `isWarmup` on `RoutineExerciseSet` / `RoutineSetInput`, optional `warmUpItems` on `Routine`, `CreateRoutineInput`, `WorkoutSession`, `CreateWorkoutSessionInput` — all in `packages/domain/src/entities.ts`. The calculator is a mobile helper, not a contract. |
| 4 — Weight in kg | yes | The calculator works in the **display unit** (the draft's `unit` in the workout, `settings.unit` in the editor) because loadable steps are unit-specific (2.5 kg / 5 lb, bar 20 kg / 45 lb). Its output goes where typed weights already go: the draft's display-unit strings (converted to kg on save by `setValuesToSave`) and the editor's strings (converted by `toKg` on save). Nothing non-kg is persisted. |
| 5 — Prisma migrations | yes | Two additive migrations, one per slice: `RoutineExerciseSet.isWarmup` (default `false`), and the two warm-up item tables. Written as files with `prisma migrate diff --from-schema-datamodel <old> --to-schema-datamodel <new> --script` (no database needed), so the SQL is exactly what Prisma would generate; the schema stays the authority. No data change. |
| 6 — Integrations behind interfaces | no | Health sync, the Live Activity and the watch are untouched; the checklist is not mirrored to them. |
| 7 — Secrets | no | |
| 8 — Committable + verified | yes | Seven code commits (calculator → workout action → routine warm-up sets API → routine editor → warm-up block API → editor/detail → active workout/history), each green on `pnpm -r typecheck` and `pnpm -r test`. |
| 9 — Dependencies | no | None. No native rebuild. |
| 10 — TODOs over half-solutions | yes | "Last time" matching by set order, and the watch not showing the checklist, are listed under Risks rather than patched. |

## Current state (verified in the code)

- **Set types.** `WorkoutSetType` is `normal | warmup | drop | failure`;
  `WorkoutSetDraft.type` holds it and the set marker cycles through it
  (`cycleWorkoutSetType`). `toCreateWorkoutSessionInput` sends `type` and
  `isWarmup: true` for warm-ups; the API stores both (`WorkoutSet.type`,
  `WorkoutSet.isWarmup`). Records and e1RM skip warm-ups via `isWarmupSet`
  (0013, 0023); volume includes performed warm-ups. FR-2 therefore holds for
  any set typed `warmup` — nothing to change server-side.
- **Routine sets** (`RoutineExerciseSet`) have `setNumber`, reps range,
  `targetWeight` (kg) and the 0021 time/distance targets. **No type**: a
  routine cannot hold a warm-up set today. `buildExerciseDrafts` makes every
  routine set a `normal` draft set.
- **Active workout draft** (`workoutDraftStore.ts`): weights are display-unit
  strings; an empty field logs its ghosted placeholder (`effectiveSetValue`).
  Ids come from the module-private `nextDraftId`. `countWorkoutSets` drives
  the "sets done" bar. Drafts are persisted (0010) and checked only loosely
  (`looksLikeDraft`: `exercises` array), so new optional fields load fine.
- **Active screen** (`ActiveWorkoutScreen.tsx`): per exercise, a set list
  (`WorkoutSetRow`) and an actions row (Add set · replace · Remove). The
  header card shows the sets-done bar.
- **Routine editor** (`RoutineFormScreen.tsx` + `RoutineSetTable.tsx`):
  `EditableRoutineSet` strings; empty fields inherit the nearest previous
  set's value (`routineSetInheritance.ts`) both as placeholder and on save.
- **Routine detail** lists sets by `setNumber`; **Duplicate** copies the
  routine through `buildRoutineCopyInput`.
- **APIs.** Routines: `PUT` replaces all exercises (delete + create in a
  transaction); bodies parsed by hand in `routes.ts`. Workouts: `POST
  /workouts` parsed by hand; ≥ 1 completed set required; `GET /workouts/:id`
  returns the mapped session.

## Approach

### Slice 1 — Approach-set calculator

**Pure helper** `apps/mobile/src/lib/approachSets.ts`:

```ts
approachSets(workingWeight: number, unit: WeightUnit): { weight: number; reps: number }[]
```

- Scheme (spec assumption): empty bar × 10, 40 % × 5, 60 % × 3, 75 % × 2,
  90 % × 1. Bar 20 kg / 45 lb, step 2.5 kg / 5 lb.
- Each percentage step is rounded to the nearest step and never below the bar
  (FR-3). A step is dropped when it is not at least one step above the
  previous kept one, or not at least one step below the working weight
  (EF-2: never as heavy as the working set). A working weight at or below the
  bar yields `[]`.
- 140 kg → 20 × 10, 55 × 5, 85 × 3, 105 × 2, 125 × 1 (AC-1); 315 lb → 45 × 10,
  125 × 5, 190 × 3, 235 × 2, 285 × 1 (AC-2); 30 kg → 20 × 10, 22.5 × 2,
  27.5 × 1 (EF-2).
  **[ASSUMPTION: the spec scenario's numbers (60 / 90 / 115 / 130) are
  illustrative; the assumption's percentage scheme is what is built.]**

**Active workout.** A new module `features/workouts/state/approachSetsDraft.ts`
(kept out of `workoutDraftStore.ts`, which 0022 is editing) exports
`addApproachSets(draft, workoutExerciseId)` →
`{ draft, outcome: 'added' | 'noWeight' | 'tooLight' }`:

- The working weight is the effective weight (typed, else placeholder) of the
  exercise's first set not typed `warmup`. None, or not a positive number →
  `noWeight`, draft unchanged (EF-1). No sets from the calculator →
  `tooLight`, draft unchanged.
- The generated sets are draft sets typed `warmup` with the weight and reps
  **typed** (not ghosted), inserted right before the first working set
  (AC-1). Warm-up sets before it that are not done are replaced, so a second
  tap after changing the working weight regenerates instead of doubling; done
  ones stay. **[ASSUMPTION: regenerating replaces the not-done warm-ups ahead
  of the first working set.]**
- They are ordinary sets afterwards: editable, removable, re-typable (FR-4);
  ticking them starts the rest like any set.
- `nextDraftId` is exported from the store (one word) so ids stay unique.

UI: a flame icon button in the exercise's actions row, only for weight &
reps exercises. `noWeight` and `tooLight` show a short notice under the
exercise's actions ("Enter the working weight first" / "Too close to the
empty bar for approach sets"), cleared on the next action.
**[ASSUMPTION: approach sets are offered for weight & reps exercises only;
other tracking types have no rep scheme.]**

**Routine editor.** Routine sets gain `isWarmup` (schema, domain, API, draft):

- `RoutineExerciseSet.isWarmup Boolean @default(false)`; `RoutineSetInput`
  and `RoutineExerciseSet` gain optional `isWarmup`. The API reads a boolean
  (anything else = not sent) and returns it only when true.
- `buildExerciseDrafts` types a routine warm-up set `warmup` in the workout.
- `EditableRoutineSet.isWarmup?`. A pure
  `features/routines/utils/routineApproachSets.ts` mirrors the workout rule
  on editor rows: working weight = effective `targetWeight` of the first
  non-warm-up row; generated rows have `targetWeight` and `minReps = maxReps`
  = the reps; not-yet-saved replace rule = all warm-up rows ahead of the
  first working row are replaced (nothing is "done" in a template).
- Inheritance skips rows of the other kind (`inheritedSetValue` compares
  `isWarmup`), so a working set never ghosts a warm-up's weight and vice
  versa.
- The set column shows `W` for a warm-up row and numbers working rows
  1, 2, 3 …; the routine detail does the same. Duplicate copies `isWarmup`.

### Slice 2 — Warm-up block

**Template.** `RoutineWarmUpItem` table (`routineId`, `orderIndex`, `name`,
`targetDurationSeconds?`, `targetReps?`), cascade-deleted with the routine.
`Routine.warmUpItems` is returned (empty array when none). On `POST`, the
list is created; on `PUT`, it is replaced **only when `warmUpItems` is sent**
— an older app that does not know the field keeps the block.
**[ASSUMPTION: absent `warmUpItems` on update keeps the block; `[]` clears
it.]** Validation: array of ≤ 20 items, each a trimmed non-empty `name` of ≤ 80
characters, optional non-negative integer `targetDurationSeconds` /
`targetReps`; anything else → 400.

**Performed.** `WorkoutWarmUpItem` table (`workoutSessionId`, `order`,
`name`, targets, `done`), cascade-deleted with the workout. `POST /workouts`
accepts optional `warmUpItems` (same item rules plus a boolean `done`) and
stores every item with its `done` (FR-7) — the names and targets are copied,
so they survive routine edits. They do not count toward "at least one
completed set". `GET /workouts(/:id)` return `warmUpItems` when there are
any.

**Mobile.**

- Draft: `WorkoutSessionDraft.warmUp?: WarmUpItemDraft[]` (`id`, `name`,
  targets, `done`), built from the routine at start. `toggleWarmUpItem`
  flips `done` and nothing else — no rest started, not in `countWorkoutSets`,
  no set touched (FR-6, AC-3). `toCreateWorkoutSessionInput` sends
  `warmUpItems` when the draft has any. Draft helpers live in a new
  `features/workouts/state/warmUpDraft.ts`; the store gets two lines (build
  and save).
- Active screen: a "Warm-up" card first, before the exercises, one row per
  item (circle → check, name, target "5:00" / "× 15"); hidden when the
  routine has none.
- Routine editor: a "Warm-up" card above the exercises — rows of name, target
  value and a chip toggling the target between time and reps, remove; "Add
  warm-up item". Empty names are dropped on save; a target that does not
  parse blocks saving with the existing "set values invalid" message.
- Routine detail: the block listed before the exercises. History detail: the
  block with each item ticked or not. Duplicate copies the block.

### Alternatives considered

- **Calculator on the server / in `packages/domain`.** Nothing but the phone
  needs it, and it works in the display unit; the domain package is
  types-only. Rejected.
- **Generated sets as ghosted placeholders.** Ghosts read as "last time" and
  are overwritten by `applyLastPerformance`. Rejected for typed values.
- **"Auto warm-up" flag on the routine exercise, computed at workout start.**
  Hides the sets from the editor and makes them impossible to edit in the
  template (FR-4). Rejected for real warm-up routine sets.
- **A `type` column on routine sets** (normal/warmup/drop/failure). Only
  warm-up is needed; the other types are a performance outcome, not a plan.
  Rejected for a boolean (mirrors `WorkoutSet.isWarmup`).
- **Warm-up block as JSON columns.** Fewer files, but the repo models every
  list as rows and a JSON shape escapes Prisma's typing. Rejected.
- **Storing only the done items on the workout.** Loses what was skipped;
  storing every item with `done` costs one boolean. Rejected.
- **Warm-up block items as a pseudo-exercise with sets.** Would count toward
  volume, sets-done and records — exactly what FR-6 forbids. Rejected.

## Shared contracts (`packages/domain`)

```ts
// RoutineExerciseSet and RoutineSetInput gain:
  /** A warm-up (approach) set in the plan (spec 0024); absent = working set. */
  isWarmup?: boolean;

export interface RoutineWarmUpItem {
  order: number;               // 1-based position in the block
  name: string;
  targetDurationSeconds?: number;
  targetReps?: number;
}
export interface RoutineWarmUpItemInput {
  name: string;
  targetDurationSeconds?: number;
  targetReps?: number;
}
export interface WorkoutWarmUpItem {
  order: number;
  name: string;
  targetDurationSeconds?: number;
  targetReps?: number;
  done: boolean;
}
export interface WorkoutWarmUpItemInput {
  name: string;
  targetDurationSeconds?: number;
  targetReps?: number;
  done: boolean;
}
// Routine.warmUpItems?: RoutineWarmUpItem[]          (absent from older servers)
// CreateRoutineInput.warmUpItems?: RoutineWarmUpItemInput[]  (absent on update = keep)
// WorkoutSession.warmUpItems?: WorkoutWarmUpItem[]
// CreateWorkoutSessionInput.warmUpItems?: WorkoutWarmUpItemInput[]
```

All additive and optional: the API fills them, the app reads them with
fallbacks, older clients never send them.

## Data model and migrations

```prisma
model RoutineExerciseSet {
  …
  /// A warm-up (approach) set in the plan (spec 0024).
  isWarmup Boolean @default(false)
}

model RoutineWarmUpItem {
  id                    BigInt   @id @default(autoincrement())
  routineId             BigInt
  orderIndex            Int
  name                  String
  targetDurationSeconds Int?
  targetReps            Int?
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt
  routine               Routine  @relation(fields: [routineId], references: [id], onDelete: Cascade)

  @@index([routineId, orderIndex])
}

model WorkoutWarmUpItem {
  id                    BigInt         @id @default(autoincrement())
  workoutSessionId      BigInt
  order                 Int
  name                  String
  targetDurationSeconds Int?
  targetReps            Int?
  done                  Boolean        @default(false)
  createdAt             DateTime       @default(now())
  workoutSession        WorkoutSession @relation(fields: [workoutSessionId], references: [id], onDelete: Cascade)

  @@index([workoutSessionId, order])
}
```

- Migration names: `20261017140000_add_routine_set_warmup`,
  `20261017150000_add_warm_up_blocks`
- Backfill / data migration needed: no — existing routine sets are working
  sets (`false`), existing routines and workouts have no block.

## API surface (`apps/api`)

- `GET /routines`, `GET /routines/:id` — sets carry `isWarmup: true` when a
  warm-up; the routine carries `warmUpItems` (ordered).
- `POST /routines`, `PUT /routines/:id` — accept `sets[].isWarmup` and
  `warmUpItems` (rules above); `400 Invalid routine payload` on a malformed
  block. `PUT` without `warmUpItems` keeps the stored block.
- `POST /workouts` — accepts `warmUpItems`; `400 Invalid workout payload` on
  a malformed one. Response and `GET /workouts(/:id)` carry `warmUpItems`
  when there are any.

## Mobile surface (`apps/mobile`)

- `lib/approachSets.ts` (+ test).
- `features/workouts/state/approachSetsDraft.ts` (+ test),
  `features/workouts/state/warmUpDraft.ts` (+ test).
- `workoutDraftStore.ts`: export `nextDraftId`; routine warm-up sets typed
  `warmup`; `warmUp` built at start and sent on save.
- `ActiveWorkoutScreen.tsx`: approach-sets button + notice; warm-up card.
- `features/routines/utils/routineApproachSets.ts` (+ test);
  `routineSetInheritance.ts` (+ test) skips the other kind;
  `RoutineSetTable.tsx` `W` marker; `RoutineFormScreen.tsx` button, save
  `isWarmup`, warm-up block card; `RoutineDetailScreen.tsx` `W` + block;
  `duplicateRoutine.ts` copies both.
- `WorkoutSessionDetailScreen.tsx`: done block.
- i18n en/es.
- No native rebuild.

## Testing strategy

| Spec AC | Verified by |
|---|---|
| AC-1 | `approachSets.test.ts` (140 kg → ascending, all < 140, multiples of 2.5); `approachSetsDraft.test.ts` (inserted before the first working set, typed `warmup`, the working set untouched). |
| AC-2 | `approachSets.test.ts` (315 lb and 140 kg shown in lb → multiples of 5, bar 45). |
| AC-3 | `warmUpDraft.test.ts` (draft from a routine with "5 min bike" / "15 band pull-aparts" lists them first; ticking leaves `countWorkoutSets`, the sets and the rest unchanged; saved input carries `done`). Route tests: block accepted and passed to the repository. Device: the card shows first. |
| FR-2 | Existing 0013/0023 tests: warm-up typed sets are excluded from records. The draft test asserts generated sets save as `type: 'warmup'`, `isWarmup: true`. |
| FR-3 | `approachSets.test.ts`: never below the bar; rounding per unit. |
| EF-1 / EF-2 | `approachSets.test.ts` (light weights, at the bar); `approachSetsDraft.test.ts` (`noWeight` / `tooLight` leave the draft as it is). |
| Routine side | `routineApproachSets.test.ts`, `routineSetInheritance.test.ts`, routine route tests (`isWarmup`, block, keep-on-absent), draft test (routine warm-up set → `warmup`). |

## Files to touch

- `packages/domain/src/entities.ts`
- `apps/api/prisma/schema.prisma`; `apps/api/prisma/migrations/20261017140000_add_routine_set_warmup/`, `…/20261017150000_add_warm_up_blocks/`
- `apps/api/src/features/routines/routes.ts`, `repository.ts`, `routes.test.ts`
- `apps/api/src/features/workouts/routes.ts`, `repository.ts`, `routes.test.ts`
- `apps/mobile/src/lib/approachSets.ts` (+ test) — new
- `apps/mobile/src/features/workouts/state/approachSetsDraft.ts`, `warmUpDraft.ts` (+ tests) — new
- `apps/mobile/src/features/workouts/state/workoutDraftStore.ts` (+ test)
- `apps/mobile/src/features/workouts/screens/ActiveWorkoutScreen.tsx`, `WorkoutSessionDetailScreen.tsx`
- `apps/mobile/src/features/routines/utils/routineApproachSets.ts` (+ test) — new
- `apps/mobile/src/features/routines/utils/routineSetInheritance.ts` (+ test), `duplicateRoutine.ts`
- `apps/mobile/src/features/routines/components/RoutineSetTable.tsx`
- `apps/mobile/src/features/routines/screens/RoutineFormScreen.tsx`, `RoutineDetailScreen.tsx`
- `apps/mobile/src/i18n/locales/en.ts`, `es.ts`
- `docs/sdd/specs/0024-warm-up-sets/*` (backlog, roadmap 01 and glossary go to the coordinator)

## Risks and open questions

- **"Last time" by set order.** `applyLastPerformance` matches previous sets
  by position, so after inserting approach sets the working sets ghost last
  time's sets at their new positions (already seen in 0023 for warm-ups).
  Generated sets have typed values, so only placeholders of later sets move.
  `TODO(sdd): match last time by working-set index (skip warm-ups) — needs a
  small spec on how "last time" treats set types.`
- **0022 (unilateral sets)** edits the same draft store and set row. This
  plan keeps the draft logic in new modules and touches the store in a few
  lines (export, type from routine, warm-up list); `WorkoutSetRow` is not
  touched. Approach sets for a unilateral exercise would be one set per row
  as generated here; whether they need left/right values is 0022's call.
- **Watch and Live Activity** (0012, 0025) show sets only; the checklist is
  phone-only. Acceptable: FR-6 makes it independent of sets.
- **Bar weight** is fixed; a person training with a 15 kg bar gets a 20 kg
  first set. Follow-up per the spec.

## Rollout

Migrations first, then the API, then the app. Both migrations are additive
with defaults. An older app ignores `isWarmup` and `warmUpItems`, and its
routine saves keep the stored block (absent = keep) — but they do drop
`isWarmup` on routine sets, since `PUT` rewrites the sets (accepted: the old
app cannot show warm-up routine sets anyway). A newer app on an older API
loses the new fields silently. No native rebuild; Metro reload or JS update.
Roll back by reverting; the columns and tables can stay.
