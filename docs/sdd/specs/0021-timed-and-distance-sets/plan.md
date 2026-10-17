---
spec: 0021
status: approved     # self-approved under the delegated gates, 2026-10-16
created: 2026-10-16
---

# Plan — Timed and distance sets

## Constitution check

| Article | Engaged? | Compliance |
|---|---|---|
| 1 — Scope control | yes | Five tracking types, targets, logging, one set timer, display in summary/history/progress, a curated catalog script. No pace, speed, zones or GPS. Records by time/distance stop at "longest" (FR-6); the full record-type machinery is 0023's. No "weight & distance" type (see Assumptions). |
| 2 — Template vs performed | yes | Targets go on `RoutineExerciseSet` (`targetDurationSeconds`, `targetDistanceMeters`); performed values use the `WorkoutSet` columns that already exist (`durationSeconds`, `distanceMeters`). No shared type. The tracking type belongs to `Exercise`, read by both sides. |
| 3 — Shared domain types | yes | `ExerciseTrackingType`, the new optional fields and `CreateExerciseInput` (today duplicated inside the mobile client) live in `packages/domain`. The domain stays types-only: the list of valid values and the per-type field rule are small constants in each app, as `WORKOUT_SET_TYPES` already is. |
| 4 — Weight in kg | yes | Weight fields keep the kg path (`toKg`/`fromKg`). Time is whole seconds, distance is metres, neither depends on the display unit. Time and distance never enter a volume (FR-5). |
| 5 — Prisma migrations | yes | One additive migration, hand-written because `migrate dev` cannot run against the owner's DB from here; it mirrors `schema.prisma` exactly and is checked with `prisma migrate deploy` + `prisma migrate diff` on a local PGlite. Existing exercises get the column default `weight_reps` (FR-1). The curated catalog list is a **data script** under `apps/api/src/scripts/`, not a migration. |
| 6 — Integrations behind interfaces | no | Health sync is untouched. |
| 7 — Secrets | no | Local verification uses an explicit local `DATABASE_URL`. |
| 8 — Committable + verified | yes | One commit per task, each green on `pnpm -r typecheck` and `pnpm -r test`. |
| 9 — Dependencies | no | None. The set timer uses `setInterval` + `Date.now()`; vibration uses the existing `Vibration` API. No native rebuild. |
| 10 — TODOs over half-solutions | yes | The set timer lives only while the workout screen is mounted; recorded in Risks. |

## Current state (verified in the code)

- **Exercise** (`schema.prisma`) has no notion of what it tracks. `POST
  /exercises` takes name + muscle groups; the mobile client types its body
  locally (`exercisesClient.ts`), not from the domain.
- **WorkoutSet** already has `durationSeconds Int?` and `distanceMeters
  Float?`; the API parses and returns them (`workouts/routes.ts`,
  `repository.ts`), but no screen writes them, and `GET
  /exercises/:id/last-performance` drops them (`ExerciseLastSet` is reps +
  weight only).
- **RoutineExerciseSet** holds `minReps`, `maxReps`, `targetWeight`. The
  routine API parses only those. `RoutineExercise` responses carry no
  exercise attributes beyond name and id.
- **Active workout draft** (`workoutDraftStore.ts`): each `WorkoutSetDraft` has
  string `reps` / `weightKg` and ghost placeholders seeded from the routine
  target and last performance; `toCreateWorkoutSessionInput` sends reps and
  weight only. Drafts are persisted (0010), so new fields must be optional.
- **Active screen** renders the set rows inline (header row + one row per set:
  marker, previous, weight, reps, ✓, remove), ~80 lines inside
  `ActiveWorkoutScreen.renderExercise`.
- **Routine editor** (`RoutineFormScreen.tsx`) renders KG / MIN / MAX inputs
  inline, with Hevy-style inheritance (`routineSetInheritance.ts`). It has the
  full exercise list in memory (`availableExercises`).
- **Display**: summary, history detail, exercise detail and progress print
  sets as `W unit × R`. `summarizeSession` sums volume = reps × weight.
- **Progress** (`progress/aggregate.ts`): points have best weight, best reps,
  volume, e1RM; `isRecordSession` = new heaviest weight. Volume is reps ×
  weight, so a set with no reps adds nothing already.
- **Catalog**: wger import (Spanish/English names). Verified in the local CSV
  export that it holds planks, hangs, L-sits, carries and cardio machines
  (e.g. `1307 Front Plank`, `1116 Dumbbell farmer's carry`, `1093 Rowing
  Machine`).

## Approach

### Tracking type

`ExerciseTrackingType = 'weight_reps' | 'reps' | 'duration' |
'weight_duration' | 'distance_duration'`, stored as a `String` column with
default `'weight_reps'` (same convention as `WorkoutSet.type`). Each type maps
to the set fields it shows, in order:

| Type | Fields |
|---|---|
| `weight_reps` | weight, reps |
| `reps` | reps |
| `duration` | time |
| `weight_duration` | weight, time |
| `distance_duration` | distance, time |

That one table (`trackingFields(type)`) drives the routine editor, the
active workout rows and what the save sends. Absent type (older server,
draft restored from before) = `weight_reps`, so AC-3 holds by construction.

### API

- `Exercise.trackingType` is returned on every exercise; `POST /exercises`
  accepts an optional valid `trackingType` (400 on an unknown value).
- Routine responses add `RoutineExercise.trackingType` (read from the
  exercise, never stored on the routine) and the two set targets; the write
  contract accepts the targets.
- `ExerciseLastSet` gains `durationSeconds` and `distanceMeters`, so "last
  time" shows 60 s for a plank.
- Progress: sets carry time and distance; points gain `bestDurationSeconds` /
  `bestDistanceMeters` (working sets only); summaries gain `trackingType` and
  latest/best time and distance. `isRecordSession` uses the record of the
  exercise's type: longest time for `duration` and `weight_duration`, longest
  distance for `distance_duration`, heaviest weight otherwise (FR-6). Volume
  is unchanged (FR-5).
- Saved workouts are shown from the values they hold, not from the exercise's
  current type, so changing a type later never changes history (EF-1).

### Mobile

- `src/lib/tracking.ts`: `trackingFields`, `parseDurationInput` ("90" → 90 s,
  "1:30" → 90 s; EF-2), `formatDistance` (m below 1 km, km above),
  `formatSetValues` (one line for a saved set, legacy `W unit × R` when it has
  no time or distance).
- Draft: `WorkoutExerciseDraft.trackingType?`; `WorkoutSetDraft` gains
  optional `duration` / `distance` strings with placeholders and targets.
  Targets ghost as placeholders (`0:45`, AC-2), last performance too. The
  save sends only the fields of the exercise's type.
- **Set row component.** The rows move out of `ActiveWorkoutScreen` into
  `components/WorkoutSetRow.tsx` (+ `WorkoutSetHeader`), which render the
  columns from `trackingFields`. The screen keeps only the list and handlers,
  so 0018's edits to the same screen stay apart, and 0022/0024 extend one
  component.
- **Set timer (FR-4).** A ▶ button in time rows. With a time (typed or
  target) it counts down from it and fills it at zero, with a vibration;
  without one it counts up. Stopping fills the elapsed time. It does not mark
  the set done. Pure rule `timerFillSeconds` is unit-tested.
- Routine editor: the set table moves to `routines/components/RoutineSetTable.tsx`,
  columns per type; validation adds time/distance. Detail screen shows the
  targets.
- Custom exercise modal: tracking type chips, default weight & reps (FR-2).
- Summary, history detail and history list: time and distance totals beside
  volume when present; per-set lines through `formatSetValues` (AC-1).
- Progress overview, exercise progress and exercise detail: timed/distance
  exercises show time/distance figures (latest, best, sessions) instead of
  kg × reps. Kept behind one branch per screen (`TimedProgressFigures`
  component) so 0023's progress rework merges cleanly.

### Catalog script

`apps/api/src/scripts/set-catalog-tracking-types.ts`: a fixed list of wger
`sourceId`s → type; updates only rows with `source = 'wger'` that are still
`weight_reps`, so it is idempotent and never overrides a later choice. Run
locally only; on the server tomorrow with the owner.

### Alternatives considered

- **Infer the type from the logged values** (no column). Rejected: a new
  exercise has no values, and the routine editor must know which fields to
  show before anything is logged (FR-3).
- **Store the tracking type on each routine exercise / workout exercise.**
  Rejected: the spec makes it a property of the exercise (FR-1). EF-1 is met
  by displaying saved sets from their values.
- **Free-form per-set field toggles** (Strong-style "add column"). More
  flexible, more UI, not asked. Rejected (Article 1).
- **Domain-level runtime helpers** (`trackingFields` in `packages/domain`).
  The package is types-only and not built for runtime; adding runtime code
  means a build step for Metro and the API image. Rejected; two tiny constant
  copies follow the existing `WORKOUT_SET_TYPES` precedent.
- **Distance in km input.** Short distances (carries, 500 m rows) are typed
  in metres in practice; km input needs decimals for those. Rejected; display
  switches to km above 1000 m.
- **A migration that sets the curated types.** Data, not schema (Article 5);
  rows differ per database. Rejected for a script.

## Shared contracts (`packages/domain`)

- `ExerciseTrackingType` (new). `Exercise.trackingType?` (optional: absent from
  older servers = `weight_reps`).
- `CreateExerciseInput` (moved from the mobile client) + `trackingType?`.
- `RoutineExercise.trackingType?` (read-only, from the exercise).
- `RoutineExerciseSet` and `RoutineSetInput`: `targetDurationSeconds?`,
  `targetDistanceMeters?`.
- `ExerciseLastSet`: `durationSeconds?`, `distanceMeters?`.
- `ExerciseProgressPoint`: `bestDurationSeconds?`, `bestDistanceMeters?`.
- `ExerciseProgressSummary`: `trackingType?`, `latestDurationSeconds?`,
  `latestDistanceMeters?`, `personalBestDurationSeconds?`,
  `personalBestDistanceMeters?`.

All additive and optional: an older app ignores them; a newer app on an older
server sees `weight_reps` behaviour.

## Data model and migrations

```prisma
model Exercise {
  trackingType String @default("weight_reps")   // new
}
model RoutineExerciseSet {
  targetDurationSeconds Int?    // new
  targetDistanceMeters  Float?  // new
}
```

- Migration name: `20261017090000_add_exercise_tracking_type`
- Backfill / data migration needed: no for the schema (default fills existing
  rows). The curated catalog types are a separate data script.

## API surface (`apps/api`)

- `GET /exercises`, `GET /exercises/:id`: + `trackingType`.
- `POST /exercises`: body + optional `trackingType`; 400 `Invalid exercise
  payload` when it is not one of the five.
- `GET/POST/PUT /routines…`: sets + `targetDurationSeconds` (integer) and
  `targetDistanceMeters` (number); exercises + `trackingType` in responses.
- `GET /exercises/:id/last-performance`: sets + `durationSeconds`,
  `distanceMeters`.
- `GET /progress/exercises[/:id]`: fields above.

No new endpoint; all auth as today.

## Mobile surface (`apps/mobile`)

See Approach. No native rebuild, no `app.json` change. i18n (en/es): tracking
type names, column labels (time, metres), timer accessibility labels, summary
labels (time, distance), progress labels (longest time / distance).

## Testing strategy

Unit (vitest): `trackingFields`, `parseDurationInput`, `formatDistance`,
`formatSetValues`, `timerFillSeconds`; draft store (targets → placeholders,
last performance, save sends only the type's fields, weight & reps unchanged);
`summarizeSession` time/distance totals; API route tests for exercise
`trackingType` validation and routine targets parsing; aggregate tests (best
time/distance, record by type, volume unchanged).

Migration: `prisma migrate deploy` on a fresh PGlite, then `prisma migrate
diff --from-url … --to-schema-datamodel …` reports no difference. Data script
run against the same local DB.

| Spec AC | Verified by |
|---|---|
| AC-1 | Draft-store test (60 s plank → `durationSeconds: 60`, no reps/weight); `summarizeSession` test (volume 0, time 60); web preview: log 60 s, save, History detail shows `1:00`, volume unchanged. |
| AC-2 | Draft-store test (target 45 s → placeholder `0:45`); web preview: routine Plank 3 × 45 s, start, rows show `0:45`. |
| AC-3 | Existing draft-store and API tests unchanged and green; web preview of a catalog exercise row (KG / REPS). |
| EF-1 | Display from saved values (`formatSetValues` test). |
| EF-2 | `parseDurationInput('90') === 90`, `formatDuration(90) === '1:30'`. |

## Files to touch

- `packages/domain/src/entities.ts`
- `apps/api/prisma/schema.prisma`, `apps/api/prisma/migrations/20261017090000_add_exercise_tracking_type/migration.sql`
- `apps/api/src/features/exercises/{repository,routes,routes.test}.ts`, `mock-exercises.ts` if typed
- `apps/api/src/features/routines/{repository,routes,routes.test}.ts`, `mock-routines.ts` if typed
- `apps/api/src/features/workouts/repository.ts` (last performance)
- `apps/api/src/features/progress/{aggregate,aggregate.test,repository}.ts`
- `apps/api/src/scripts/set-catalog-tracking-types.ts`, `apps/api/package.json` (script entry)
- `apps/mobile/src/lib/tracking.ts` (+ test)
- `apps/mobile/src/features/workouts/state/workoutDraftStore.ts` (+ test)
- `apps/mobile/src/features/workouts/components/WorkoutSetRow.tsx`, `SetTimerButton.tsx`, `utils/setTimer.ts` (+ test)
- `apps/mobile/src/features/workouts/screens/ActiveWorkoutScreen.tsx` (rows replaced by the component; add-exercise passes the type)
- `apps/mobile/src/features/workouts/utils/sessionStats.ts` (+ test), `screens/{WorkoutSummaryScreen,WorkoutSessionDetailScreen,WorkoutHistoryScreen}.tsx`
- `apps/mobile/src/features/routines/components/RoutineSetTable.tsx`, `CustomExerciseModal.tsx`, `screens/{RoutineFormScreen,RoutineDetailScreen}.tsx`, `utils/routineSetInheritance.ts`
- `apps/mobile/src/features/exercises/api/exercisesClient.ts`, `screens/ExerciseDetailScreen.tsx`
- `apps/mobile/src/features/progress/components/TimedProgressFigures.tsx`, `screens/{ProgressOverviewScreen,ExerciseProgressDetailScreen}.tsx`
- `apps/mobile/src/i18n/locales/{en,es}.ts`
- `docs/sdd/specs/0021-timed-and-distance-sets/*`

## Risks and open questions

- `TODO(sdd): the set timer stops if the workout screen is left or the app is
  killed — it is screen state; moving it into the draft like 0018's rest
  would make it survive, if the owner asks for it.`
- **0018 merge.** Both edit `ActiveWorkoutScreen.tsx`. This plan replaces the
  inline set rows with `<WorkoutSetRow>`; 0018 adds a ref per set row and a
  chip on exercise headers. Expected conflict: the row block; resolution is to
  put 0018's row ref on a wrapper around `<WorkoutSetRow>`.
- **0023 merge.** Both edit `aggregate.ts` and the progress screens. Changes
  here are additive fields plus one branch per screen.
- **Catalog names drift.** The script keys on wger `sourceId`s seen in the
  2026-10 export; ids missing on a database are skipped and reported.
- **`createExercise` returns an existing exercise with the same name** (any
  owner). Its type then stays whatever it was; unchanged behaviour, noted.

## Rollout

1. Server: apply the migration (`prisma migrate deploy` runs on API container
   start) — additive, old app versions keep working.
2. Server: run `set-catalog-tracking-types` once against the server DB.
3. App: Metro reload / JS update; no rebuild. A new app on an old server
   behaves as weight & reps everywhere.

Rollback: revert the app commits; the columns can stay (defaults keep old
behaviour).

## Assumptions

- **[ASSUMPTION: the five types in the spec's scope are the whole set; a carry
  is logged as weight & time ("24 kg × 45 s"). "20 kg for 40 m" needs a
  sixth type, weight & distance, left for a follow-up.]**
- **[ASSUMPTION: distance is typed in metres; shown in km from 1000 m.]**
- **[ASSUMPTION: the set timer counts down from the set's time when it has
  one (typed or target) and up otherwise; stopping fills the elapsed time; it
  never ticks the set.]**
- **[ASSUMPTION: a typed time is normalised to m:ss when the field loses
  focus.]**
- **[ASSUMPTION: `reps`-only exercises keep the heaviest-weight record rule
  (no record); their records belong to 0023.]**
