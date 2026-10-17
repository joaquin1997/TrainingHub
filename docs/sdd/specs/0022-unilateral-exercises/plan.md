---
spec: 0022
status: approved     # self-approved under the delegated gates, 2026-10-17
created: 2026-10-17
---

# Plan — Unilateral exercises (left / right)

## Constitution check

| Article | Engaged? | Compliance |
|---|---|---|
| 1 — Scope control | yes | A flag on the exercise, left/right reps on a performed set, both sides in volume, the better side in records, per-side "last time". Same weight for both sides (spec out of scope); no per-side time or distance (see Assumptions); no imbalance chart — the gap is read from History and "last time". |
| 2 — Template vs performed | yes | The flag lives on `Exercise` and is read by both sides, like 0021's tracking type. Per-side values go on `WorkoutSet` only. Routine targets stay one rep range, read per side; `RoutineExerciseSet` is untouched. |
| 3 — Shared domain types | yes | `Exercise.isUnilateral`, `RoutineExercise.isUnilateral`, `CreateExerciseInput.isUnilateral`, `SetExerciseUnilateralInput`, `repsLeft` / `repsRight` on `WorkoutSet`, `WorkoutSetInput` and `ExerciseLastSet` — all in `packages/domain`, all optional. The domain stays types-only. |
| 4 — Weight in kg | yes | No new weight. The one weight of a set stays `weightKg`; volume is weight × (left + right) in kg. |
| 5 — Prisma migrations | yes | One additive migration (`Exercise.isUnilateral` default false, `WorkoutSet.repsLeft` / `repsRight` nullable), hand-written because `migrate dev` cannot reach the owner's DB; mirrors `schema.prisma` exactly and is checked with `migrate deploy` + `migrate diff` on a local PGlite. No data change: existing exercises are bilateral. |
| 6 — Integrations behind interfaces | no | Health sync and the watch bridge are untouched; the watch receives a target string, as today. |
| 7 — Secrets | no | Local verification uses an explicit local `DATABASE_URL`. |
| 8 — Committable + verified | yes | One commit per task, each green on `pnpm -r typecheck` and `pnpm -r test`. |
| 9 — Dependencies | no | None. `Switch` is React Native core. No native rebuild. |
| 10 — TODOs over half-solutions | yes | Marking an exercise during a workout does not change exercises already in it; recorded in Risks. |

## Current state (verified in the code)

- **Exercise** has `trackingType` (0021) and no notion of sides. The only
  write endpoint besides create is the photo (`PUT /exercises/:id/photo`,
  creator only, `app.authenticate`).
- **WorkoutSet** holds one `reps`, one `weightKg`. Every volume in the
  product is `reps × weightKg`: `summarizeSession` / `exerciseVolumeKg`
  (mobile), `buildAccumulators`, `sessionVolume`, `buildMuscleGroupVolume`
  and the set/session volume records (`records.ts`). Best reps, e1RM, most
  reps and reps-at-weight read `set.reps`.
- **Saving** (`toCreateWorkoutSessionInput`, `toWorkoutSessionSkeleton`) goes
  through one function, `setValuesToSave(set, trackingType, unit)`.
- **Active screen** rows are `WorkoutSetRow` / `WorkoutSetHeader`
  (0021), columns from `trackingFields(type)`; "previous" is
  `previousSetLabel`.
- **Saved sets** are printed by `formatSetValues` (summary, History detail,
  exercise detail, timed progress, share text 0028).
- **Watch** (0025) shows `setTarget(set, unit, trackingType)`, a string
  built on the phone; the Swift side only displays it.
- **Routines** responses already carry `trackingType` read from the exercise;
  the draft copies it onto `WorkoutExerciseDraft` when the workout starts or
  an exercise is added / replaced.

## Approach

### Data: `reps` stays the total, the split sits beside it

A unilateral set stores `repsLeft` and `repsRight`, and **`reps` holds their
sum**. The server derives `reps` from the sides whenever a side is sent, so
the invariant cannot drift. Consequences:

- Every volume in the product — summary, History, weekly volume, muscle
  volume, set and session volume records — already reads `reps × weightKg`
  and is right without change (FR-3, AC-1: 20 × (10 + 8) = 360 kg).
- An older app reading a new workout shows "20 kg × 18": the total, not
  wrong, just not split.
- Only the readers that must use **the better side** change (Assumption in
  the spec): best reps, e1RM, most reps and reps at weight go through
  `recordReps(set)` = max(left, right) for a split set, `reps` otherwise.

A side with no value (EF-1) is stored as null and adds nothing; a set with
neither side has no reps, as an empty set does today.

### Marking an exercise (FR-1)

`Exercise.isUnilateral` (default false). Two ways to set it:

- the custom exercise form gets a "Left and right" switch (create);
- the exercise detail screen gets the same switch for any exercise,
  through `PUT /exercises/:id/unilateral { isUnilateral }` — allowed on
  catalog exercises and on one's own custom ones (403 on someone else's,
  like the photo). Catalog exercises have to be markable: the owner's
  examples (Bulgarian split squat, one-arm row) are catalog rows.

Routines return `RoutineExercise.isUnilateral` read from the exercise.

The flag applies to the tracking types that log reps (`weight_reps`,
`reps`); on the others it is kept but has no effect.

### Active workout (FR-2, FR-4)

- Draft: `WorkoutExerciseDraft.isUnilateral?`; `WorkoutSetDraft` gains
  optional `repsLeft` / `repsRight` and their placeholders. Optional, so
  drafts persisted before (0010) still load.
- Placeholders: a side falls back to the set's `repsPlaceholder` when it has
  none of its own, so routine targets (a per-side rep range) and the
  previous set's value ghost on both sides with no change to how drafts are
  built. "Last time" fills `repsLeftPlaceholder` / `repsRightPlaceholder`
  from a split last set (FR-4); a last set logged without sides (the
  "log one side" workaround) ghosts its reps on both sides.
- Save: `setValuesToSave` gets the exercise's `isUnilateral`; for a
  unilateral rep exercise it sends `repsLeft`, `repsRight` and `reps` =
  their sum. Typing 0 on a side records that side as not done (EF-1).
- Row: `WorkoutSetHeader` / `WorkoutSetRow` take `unilateral`; the reps
  column becomes two narrower columns **L** and **R** side by side in the
  same row (decision 2026-10-16). Weight stays one column. "Previous" reads
  `20×10/8`.
- Adding, replacing (0020) and starting from a routine carry the flag like
  `trackingType`.

### Display of saved sets

`formatSetValues` prints a split set as `20 kg × 10 L / 8 R` (letters from
i18n: L/R, I/D in Spanish), from the values the set holds — not from the
exercise's current flag, so marking or unmarking later never changes
history. Used by summary, History detail, exercise detail and share text
(0028), which therefore show both sides (AC-1). The watch (0025) target
reads `20 kg × 10/8`; nothing changes on the Swift side.

### Alternatives considered

- **`reps` null on split sets, sides only.** Cleaner on paper; every volume
  and "has reps" reader (API and app, about ten places, several also touched
  by 0024) would need a side-aware rewrite, and an older app would show
  "× –". Rejected.
- **`reps` = better side.** Records would be right by default, but every
  volume would be wrong until rewritten. Rejected; volume has more readers
  than records.
- **Two sets per side (one row each).** The owner decided one row with both
  sides (2026-10-16).
- **A per-user "I do this one-sided" table** (like favourites). The spec puts
  the term on the exercise; the app has one household of users. Rejected for
  now; see Assumptions.
- **A curated catalog script, like 0021's.** The wger catalog cannot be read
  from here (no network to wger, no local export), so the ids could not be
  checked; and a person's own choice covers the exercises they actually do.
  Rejected; the switch on the detail screen does it.
- **Per-side time for timed exercises** (side plank). Out of what the spec's
  scenario needs; would double the set timer. Left for a follow-up.

## Shared contracts (`packages/domain`)

- `Exercise.isUnilateral?: boolean` — absent from older servers = false.
- `CreateExerciseInput.isUnilateral?: boolean`.
- `SetExerciseUnilateralInput { isUnilateral: boolean }` (new).
- `RoutineExercise.isUnilateral?: boolean` (read-only, from the exercise).
- `WorkoutSet`, `WorkoutSetInput`, `ExerciseLastSet`: `repsLeft?`,
  `repsRight?`; doc on `reps`: for a split set, the sum of both sides.

All additive and optional.

## Data model and migrations

```prisma
model Exercise {
  isUnilateral Boolean @default(false)   // new
}
model WorkoutSet {
  repsLeft  Int?   // new
  repsRight Int?   // new
}
```

- Migration name: `20261017150000_add_unilateral_exercises`
- Backfill / data migration needed: no (default false; old sets have no
  sides).

## API surface (`apps/api`)

- `GET /exercises`, `GET /exercises/:id`, `POST /exercises` response:
  + `isUnilateral`. `POST /exercises` body: optional boolean `isUnilateral`
  (400 `Invalid exercise payload` if present and not boolean).
- `PUT /exercises/:id/unilateral` (authenticated): body `{ isUnilateral:
  boolean }`; 200 with the exercise; 400 on a bad body; 404 unknown; 403
  someone else's custom exercise.
- `GET /routines…`: routine exercises + `isUnilateral`.
- `POST /workouts`: sets accept `repsLeft` / `repsRight` (non-negative
  integers; 0 or anything else = no value); when either is present `reps`
  is replaced by their sum. `GET /workouts…` returns them.
- `GET /workouts/exercises/:id/last`: sets + `repsLeft` / `repsRight`.
- Progress: best reps and e1RM per point, most reps, reps at weight and
  e1RM records use the better side; volumes unchanged.

## Mobile surface (`apps/mobile`)

See Approach. Files: draft store, `WorkoutSetRow`, `ActiveWorkoutScreen`
(pass the flag), `replaceExercise`, `lib/tracking.ts` (`formatSetValues`),
summary / History detail / exercise detail / share text, watch protocol,
custom exercise form, exercise detail switch, `exercisesClient`. i18n en/es:
side letters, column labels, the switch label and hint. No native rebuild.

## Testing strategy

Unit (vitest): `splitReps` / `recordReps` (API), route parsing (sides →
total, bad values dropped, `isUnilateral` validation, unilateral endpoint
403/404/200), aggregate + records (AC-1 volume 360, e1RM / most reps from
the better side); mobile draft store (save sends L/R and total, EF-1 empty
side, placeholders from target, last time per side, previous set), `formatSetValues`
split line, `summarizeSession` volume 360, `setTarget` and share text with
sides.

Migration: `prisma migrate deploy` on a fresh PGlite, then `prisma migrate
diff --from-url … --to-schema-datamodel …` reports no difference.

| Spec AC | Verified by |
|---|---|
| AC-1 | API: route test (10 L / 8 R → reps 18) + aggregate test (volume 360); mobile: draft test (save sends 10/8/18), `summarizeSession` 360, `formatSetValues` "20 kg × 10 L / 8 R"; web preview if a local API runs. Device check (owner). |
| FR-1 | Route tests (create flag, unilateral endpoint); detail switch on device. |
| FR-4 | Draft-store test (last 10/8 → placeholders 10 and 8). |
| EF-1 | Draft-store test (right empty → `repsRight` absent, `reps` 10); route test (0 → null). |
| Assumption (better side) | Records test (e1RM and most reps from 10, not 18). |

## Files to touch

- `packages/domain/src/entities.ts`
- `apps/api/prisma/schema.prisma`, `apps/api/prisma/migrations/20261017150000_add_unilateral_exercises/migration.sql`
- `apps/api/src/features/exercises/{repository,routes,routes.test}.ts`
- `apps/api/src/features/routines/repository.ts`
- `apps/api/src/features/workouts/{sides,sides.test,routes,routes.test,repository}.ts`
- `apps/api/src/features/progress/{aggregate,aggregate.test,records,records.test,repository}.ts`
- `apps/mobile/src/features/workouts/state/workoutDraftStore.ts` (+ test)
- `apps/mobile/src/features/workouts/components/WorkoutSetRow.tsx`, `screens/ActiveWorkoutScreen.tsx`, `utils/replaceExercise.ts`
- `apps/mobile/src/lib/tracking.ts` (+ test), `features/workouts/utils/shareText.ts` (+ test), `screens/{WorkoutSummaryScreen,WorkoutSessionDetailScreen}.tsx`, `features/exercises/screens/ExerciseDetailScreen.tsx`
- `apps/mobile/src/features/workouts/watch/watchProtocol.ts` (+ test)
- `apps/mobile/src/features/exercises/{api/exercisesClient.ts,components/CustomExerciseForm.tsx}`
- `apps/mobile/src/i18n/locales/{en,es}.ts`
- `docs/sdd/specs/0022-unilateral-exercises/*`

## Risks and open questions

- `TODO(sdd): marking an exercise unilateral while it is already in the
  active workout does not change that workout (the flag is captured when
  the exercise joins, like 0021's tracking type); the next workout picks it
  up. Toggle it on the draft too if the owner asks.`
- **0024 merge (warm-up sets, in parallel).** Both touch `entities.ts`,
  `schema.prisma` (different models), `workoutDraftStore.ts`,
  `WorkoutSetRow.tsx`, `ActiveWorkoutScreen.tsx`, the workouts route parser
  and the locales. Changes here are kept additive: new optional fields, one
  extra parameter on `setValuesToSave` / `setTarget`, a `unilateral` prop on
  the row; no reshuffling.
- **The flag is global to the exercise.** Marking a catalog exercise marks
  it for everyone on the server. Fine for one household; spec 0015 / a
  wider distribution may want it per person.
- **Older app versions** save no sides for a unilateral exercise; they keep
  logging one `reps` as today.

## Rollout

1. Server: apply the migration (`prisma migrate deploy` on API start) —
   additive; old apps keep working.
2. App: Metro reload / JS update; no rebuild. A new app on an old server
   sends sides the server ignores (it keeps `reps` = the sum the app sends)
   and shows no switch effect after reload.

Rollback: revert the app commits; the columns can stay.

## Assumptions

- **[ASSUMPTION: a split set stores `reps` = left + right beside
  `repsLeft` / `repsRight`, so volume and older apps read the total.]**
- **[ASSUMPTION: the flag applies to rep-based tracking types only;
  per-side time or distance is a follow-up.]**
- **[ASSUMPTION: routine targets are per side — a 8–10 target ghosts 10 on
  both sides; no per-side targets in routines.]**
- **[ASSUMPTION: any signed-in person can mark a catalog exercise
  unilateral; a custom one only its creator. The flag is on the exercise,
  not per person.]**
- **[ASSUMPTION: as for every field, an empty side logs its ghosted value;
  typing 0 records that side as not done (EF-1). With no value and no ghost,
  the side is not done.]**
- **[ASSUMPTION: best reps, e1RM, most reps and reps at weight use the
  better side; set and session volume records use both sides (FR-3).]**
