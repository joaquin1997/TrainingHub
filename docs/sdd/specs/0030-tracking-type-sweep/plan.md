---
spec: 0030
status: approved     # self-approved under the delegated gates, 2026-10-17
created: 2026-10-17
---

# Plan — Tracking type sweep of the catalog

## Constitution check

| Article | Engaged? | Compliance |
|---|---|---|
| 1 — Scope control | yes | A pure classifier, a report → apply → undo script, one column saying who set the type, one endpoint and one control on the exercise detail. No new tracking type, no in-app review screen, no conversion of logged sets or routine targets, no bulk unilateral, no per-person types. |
| 2 — Template vs performed | yes | The sweep and the endpoint write `Exercise` only. `WorkoutSet` and `RoutineExerciseSet` are read (usage counts) and never written. Records read performed sets through the exercise's current type (FR-17) without changing them. |
| 3 — Shared domain types | yes | `SetExerciseTrackingTypeInput` (body of the new endpoint) lives in `packages/domain`, next to `SetExerciseUnilateralInput`. The "who set it" marker is server-only (no client reads it), so it is not added to the domain `Exercise`. |
| 4 — Weight in kg | no | No weight is written. |
| 5 — Prisma migrations | yes | One additive column, hand-written migration mirroring `schema.prisma` exactly (`20261018130000_add_exercise_tracking_type_set_by`), checked with `migrate deploy` + `migrate diff` on a local PGlite. The classification itself is **data**: a script under `apps/api/src/scripts/`, never a migration, run once by the owner after review. No backfill in the migration (see "Who set it"). |
| 6 — Integrations behind interfaces | no | The script reuses the existing wger client of the importer, like 0026; not a runtime integration. |
| 7 — Secrets | no | The script uses `DATABASE_URL` from `apps/api/.env` on the owner's machine; nothing new committed. |
| 8 — Committable + verified | yes | One commit per task, each green on `pnpm -r typecheck` and `pnpm -r test`. |
| 9 — Dependencies | no | None. No native rebuild (chips and the existing `ActionSheet`). |
| 10 — TODOs over half-solutions | yes | The real classification can only be judged on the owner's catalog (wger is unreachable from the sandbox): the classifier is unit-tested on real catalog names, and the report is reviewed before apply. Undo depends on the run file kept on the owner's machine (Risks). |

## Current state (verified in the code, 2026-10-17)

- `Exercise.trackingType String @default("weight_reps")` (0021) with the five
  values validated by `features/exercises/trackingTypes.ts`. Nothing records
  who set it. `POST /exercises` accepts a `trackingType` for custom exercises.
- `scripts/set-catalog-tracking-types.ts` (0021, npm `catalog:tracking-types`):
  44 wger `sourceId`s → type, updates only rows still `weight_reps`.
- `scripts/match-free-exercise-images.ts` (0026): dry run by default writing a
  CSV under `tmp/`, `IMPORT_TO_DB=true` to write; fetches wger translations at
  run time through `fetchAllWgerExerciseInfos()`; pure matching in a tested
  module. This plan follows the same shape.
- wger `exerciseinfo` gives, per exercise: `translations[]` (`name`,
  `language` id), `category.name` (Abs, Arms, Back, Calves, Cardio, Chest,
  Legs, Shoulders) and `equipment[].name` (e.g. "none (bodyweight exercise)",
  "Barbell", "Dumbbell", "Kettlebell", "SZ-Bar", "Pull-up bar", "Gym mat").
  The catalog stores one name (`Exercise.name`, mostly Spanish), `category`
  and `equipment`. **The wger API is not reachable from this sandbox (proxy
  403)**: translations are only available when the owner runs the script.
- `PUT /exercises/:id/unilateral` (0022): strict auth; a catalog exercise can
  be changed by anyone signed in, a custom one only by its creator (403
  otherwise, 404 missing); returns the `Exercise`. The detail screen shows the
  switch only to whoever may use it.
- **Effect on logged work (FR-15..18), verified:**
  - Saved sets are displayed from their own values (`formatSetValues`, 0021
    EF-1); volume is `reps × weight` of stored sets → FR-15/16 hold by
    construction (the sweep never writes a set).
  - "Last time" in the set row (`previousSetLabel`) prints only the fields of
    the exercise's type and `–` when none is present → an old "0 kg × 60"
    plank shows `–`, never `0:00`. Placeholders take a time only from a
    logged time (`applyLastPerformance`). FR-17 "last time" holds already.
  - **Records do not follow the type**: `progress/records.ts` derives every
    record type from whatever values the sets hold, so a plank swept to time
    would keep "most reps 60" from its "0 kg × 60" sets. FR-17 needs a change
    (task 6).
  - Routine sets keep every target column; the editor and the detail show
    the columns of the exercise's current type (0021). The sweep never writes
    a routine → FR-18 / AC-7 hold by construction.
  - The active workout keeps the type captured when each exercise was added
    (0021 draft) → EF-4 holds.
- `apps/api/src/features/exercises/{routes,repository}.ts` and its route test
  mock list are being changed by 0015 in parallel.

## Approach

### 1. Who set it (FR-6, FR-13)

New column `Exercise.trackingTypeSetBy String @default("system")`, values
`system` | `person`. `system` = the default or a sweep; `person` = changed by
hand (the new endpoint). Every existing row becomes `system`, which is the
spec's assumption for catalog exercises.

Custom exercises are **not** backfilled to `person`: the sweep selects only
`source = 'wger' AND isSystemDefined = true`, so a custom exercise is never a
candidate whatever the column says (FR-6, AC-4). A backfill would be a data
change inside a migration for no behaviour. **[ASSUMPTION: "set by a person
at creation" is enforced by the sweep never selecting custom exercises, not
by a stored value; `createExercise` (0015's file) is left untouched.]**

### 2. Classifier (pure, unit-tested) — FR-1, FR-3, FR-4, FR-10

`apps/api/src/scripts/trackingTypeSweep/classify.ts`:

```ts
classifyExercise(
  { sourceId, names: string[], category?, equipment: string[] },
  { corrections, curated },
): { type; reason; certain: boolean }
```

Decided in this order (first that applies wins):

1. **Owner correction** (`data/tracking-type-corrections.json`,
   `{ "<sourceId>": { "type": "...", "name": "..." } }`) → certain, reason
   `owner correction` (FR-4, AC-8).
2. **0021 hand-picked list** (moved verbatim to `trackingTypeSweep/curated.ts`;
   the old script imports it from there) → certain, reason `0021 list`
   (FR-10).
3. **Name rules** (`trackingTypeSweep/rules.ts`), evaluated over every name of
   the movement (stored name + every wger translation), normalised (lower
   case, accents stripped, `ß`→`ss`, punctuation → space). A keyword is a
   whole-word phrase; `*` at the end of a phrase matches a word prefix
   (`flexion*`, `liegestutz*`), at the start a word suffix (`*stutz`) for
   German compounds. Each rule has `exclude` keywords that cancel it when
   present in any name. Rules in priority order (keywords in Spanish,
   English, German, Italian, plus French/Portuguese where wger uses them):
   - `loadable-bodyweight` → **weight & reps, certain**: pull-up / chin-up /
     dominada / klimmzug / trazion*, dip / fondos / dips, lunge / zancada /
     estocada / ausfallschritt / affond*, step-up, hip thrust / empuje de
     cadera, back extension / hiperextension / rückenstrecker (spec
     assumption 2). Excludes holds ("isometric pull-up hold" falls to time).
   - `carry` → **weight & time, certain**: carry / carries / farmer* walk /
     paseo del granjero / caminata del granjero / acarreo / transporte /
     bauernlauf / farmer / suitcase / waiter walk / yoke / sled / trineo /
     prowler / schlitten / slitta. Before `walk` so "farmer's walk" is a carry.
   - `hold` → **time, certain**: plank / plancha / planche (the hold) /
     unterarmstutz / *stutz / planke / plank* (it. "plank") / hollow hold /
     hold / isometric* / isometr* / estatic* / static / wall sit / sentadilla
     en pared / wandsitzen / l sit / lsit / dead hang / bar hang / hangboard /
     fingerboard / regleta / suspension en regleta / sospensione. Excludes
     dynamic words (jack, row / remo, push up, up down, walk, tap, toque,
     climber, escalador, dip, reach, rotation / rotacion, knee, crunch, to),
     so "plank jacks" or "plank row" are not proposed as time.
   - `stretch` → **time, certain**: stretch* / estiramiento / estirar /
     dehnung / dehnen / allungamento / stretching / etirement / mobility hold
     / yoga pose.
   - `jump-rope` → **time, certain**: jump rope / skipping rope / rope skipping
     / saltar la cuerda / salto a la comba / comba / seilspring* / springseil /
     salto della corda / skipping.
   - `cardio-ambiguous` → **time, uncertain**: battle rope / cuerdas de
     batalla / stair climber / stairmaster / escaladora / step machine; and
     **reps, uncertain**: mountain climber / escalador / bergsteiger /
     scalatore (spec assumption 3: the type most people log with, reviewed).
   - `distance` → **distance & time, certain**: run / running / jog* / correr /
     carrera / trote / trotar / laufen / dauerlauf / corsa / walk / walking /
     caminar / caminata / andar / gehen / camminata / treadmill / cinta de
     correr / laufband / tapis roulant / rowing machine / indoor rowing / rower
     / remoergometro / ergometro de remo / ruderergometer / rudergerat /
     vogatore / bike / bicycle / cycling / ciclismo / bicicleta / spinning /
     fahrrad / radfahren / cyclette / elliptical / eliptica / crosstrainer /
     cross trainer / ellittica / swim / swimming / natacion / nadar / schwimmen
     / nuoto / ski erg / ski machine / hiking / senderismo. Excludes
     crunch / abdominal / encogimiento / twist / sit (the "bicycle crunch") and
     the plain lifting row (`remo` alone is never matched; only the machine
     names above). `sprint` → distance & time, **uncertain**.
   - `bodyweight-reps` → **reps only, certain** (spec assumption 2): push-up /
     pushup / press up / flexion* / lagartija* / liegestutz* / piegament* /
     flession* / pompe, burpee*, sit-up / situp / abdominal* / crunch* /
     encogimiento*, jumping jack* / salto* de tijera / hampelmann, air squat /
     bodyweight squat / sentadilla sin peso / sentadilla libre, leg raise* /
     elevacion* de pierna* / beinheben / knee raise* / elevacion* de rodilla*,
     box jump* / salto al cajon / jump squat / tuck jump / v up / flutter
     kick*. Cancelled when the movement is loaded: equipment has barbell,
     dumbbell, kettlebell, SZ-bar, cable, machine or plate, or a name says
     cable / polea / maquina / machine / kabel / cavo / weighted / lastre /
     con peso / disco / plate / mancuerna / dumbbell / barbell / kettlebell /
     pesa (e.g. "crunch en polea" stays weight & reps).
4. **No rule**: weight & reps (FR-3). **Certain** when the equipment is a load
   (barbell, dumbbell, kettlebell, SZ-bar, cable, machine, plate — the
   catalog's normal lifts), **uncertain** otherwise (bodyweight, mat, ball,
   band or no equipment, and every category "Cardio" exercise without a
   rule): those are the rows the owner reviews. Reason `no rule` (+ `cardio:
   review` for the cardio category).

Never guessed: any exercise the rules cannot place is weight & reps (FR-3).
The only non-default uncertain calls are the ambiguous moves the spec names
(assumption 3).

### 3. Sweep plan (pure, unit-tested) — FR-1/2, FR-6..9, EF-1/2/7

`trackingTypeSweep/sweep.ts`:

- `parseCorrections(json)` → corrections or a list of errors naming each bad
  entry (unknown type, missing type). The script stops on any error before
  touching the database (EF-2), in report, apply and undo alike.
- `planSweep(catalog, classify)` → one row per catalog exercise (FR-1):
  names (stored, English, other languages), category, equipment, current
  type, proposed type, reason, certainty, set by, routine and workout uses,
  `change` (`yes` / `no` / `skipped: set by a person`), and `unilateral
  without reps` (EF-7). Plus totals per proposed type (sum = catalog size,
  AC-1), the number that would change, and `missing`: correction and
  0021-list ids not in this database (EF-1).
- Rows sorted: would change and used (most uses first), then would change,
  then unchanged — FR-2's "list first".
- `toCsv(rows)` → the report file.
- `planUndo(runLog, current)` → reverts only exercises still at the type the
  run gave them and still `system` (FR-9, AC-9).

### 4. Script — report → apply → undo

`apps/api/src/scripts/sweep-tracking-types.ts`, npm (from `apps/api`; `build`
already runs `prisma generate`):

| npm script | Does |
|---|---|
| `catalog:tracking-sweep` | Report only (FR-5): fetch wger translations + languages, classify every catalog exercise, write `tmp/tracking-type-sweep.csv`, print totals, the used exercises that would change, EF-7 flags and missing ids. No write. |
| `catalog:tracking-sweep:apply` | `SWEEP_APPLY=true`: the same classification, then apply. |
| `catalog:tracking-sweep:undo` | `SWEEP_UNDO=<run file>`: revert one run. |

- **Apply** writes the run file `tmp/tracking-type-sweep-runs/<timestamp>.json`
  (`{ appliedAt, changes: [{ sourceId, name, from, to }] }`) **before** the
  write, then one `$transaction` of `updateMany` calls grouped by
  `(from, to)`, each guarded by `source = 'wger'`, `isSystemDefined`,
  `trackingTypeSetBy = 'system'` and `trackingType = from`. All or nothing
  (EF-3); a re-run recomputes from the database, so it finishes the job and a
  second run says `0 changed` and writes no run file (FR-7, AC-3). Prints
  changed (name, old → new) and skipped with the reason (FR-8). The sweep
  keeps `trackingTypeSetBy = 'system'` (FR-11: a later import arrives as
  `weight_reps`/`system` and is picked up by the next run).
- **Undo** reads a run file, keeps the entries still at `to` and `system`,
  reverts them in one transaction, and lists what it left because a person
  (or a later run) changed it since (AC-9).
- **No translations**: if wger cannot be reached the script stops. With
  `SWEEP_WITHOUT_TRANSLATIONS=true` it classifies from the stored name,
  category and equipment only and says so in its output (used for the local
  check; the owner should not need it).
- The 0021 script stays (its npm script is referenced by the backlog's owner
  steps) but reads its list from `curated.ts`; its header says the sweep
  supersedes it. Running it before or after the sweep is harmless.

### 5. Changing the type by hand — FR-12..14, EF-6

- **API** `PUT /exercises/:id/tracking-type`, body `{ trackingType }`
  (`SetExerciseTrackingTypeInput`). Strict auth (401). 400 when the type is
  not one of the five. 404 missing; 403 for someone else's custom exercise
  (EF-6), the same rule as the unilateral switch. Sets `trackingType` and
  `trackingTypeSetBy = 'person'` (FR-13) even when the type is unchanged
  (choosing it is a person's decision). Returns the `Exercise`.
  To keep clear of 0015's edits it lives in new files
  `features/exercises/trackingTypeRoutes.ts` +
  `trackingTypeRepository.ts`, registered with one line in
  `routes/index.ts`; the repository reads the result back through
  `findExerciseById` and repeats the 0022 ownership check locally (the
  existing helper is private to `repository.ts`).
- **Mobile** exercise detail: a card "What each set records" with the five
  chips (same labels as the create form), shown to whoever may change it
  (catalog: anyone; custom: the creator). Choosing another type:
  - with saved sessions of this exercise (the detail already loads them for
    "Recent sessions"), an `ActionSheet` first: "Past workouts keep what was
    logged. "Last time" and records only use sets with the new type's
    values." with the action "Change to <type>" (FR-14);
  - then `exercisesClient.setTrackingType`, optimistic with rollback and an
    error line, like the unilateral switch. The unilateral switch hides when
    the new type has no reps (its mark is kept, EF-7).

### 6. Records follow the current type — FR-17

In `progress/aggregate.ts` (`buildRecordHistories`) each working set is
reduced to the values of the exercise's **current** type before records are
derived (`weight_reps` → weight, reps and sides; `reps` → reps and sides;
`duration` → time; `weight_duration` → weight and time; `distance_duration`
→ distance and time). An old "0 kg × 60" plank set then holds no time and
gives no record; points, volume and history keep the raw values (FR-15/16).
When no type is known (pure-function callers) sets stay as they are.
**[ASSUMPTION: "records only use the new type's values" is applied by
projecting sets, so a weight & reps exercise with a stray timed set no longer
gets a "longest time" record either.]**

### Alternatives considered

- **Re-run of the 0021 approach (more sourceIds by hand).** ~900 rows by hand,
  no rules, nothing for new imports (FR-11). Rejected; the list survives as
  overrides.
- **Apply from the CSV the owner edited.** One file to edit, but a CSV of 900
  rows round-trips badly (spreadsheet quoting, encodings) and a re-import
  would lose the edits. Rejected for a small corrections JSON keyed by
  `sourceId` that survives every run (FR-4).
- **Classify inside the wger importer.** Couples import and review; FR-5 wants
  a separate, explicit apply. Rejected.
- **A migration with the classification.** Data, not schema (Article 5).
  Rejected.
- **Run log in a database table** for undo. Another migration and a table for
  a SHOULD; the run file on the owner's machine is enough for one household.
  Rejected (Article 1); noted in Risks.
- **A boolean `trackingTypeSetByPerson`.** Same cost; a string reads better in
  SQL and the report and leaves room for `import`. Chose the string.
- **Adding `setExerciseTrackingType` to `repository.ts`.** Natural home, but
  0015 is rewriting that file and its test's mock list in parallel. Rejected
  for two small new files.
- **Confirm only through a native `Alert`.** Does not show buttons on web.
  Rejected for the existing `ActionSheet`.

## Shared contracts (`packages/domain`)

- `SetExerciseTrackingTypeInput { trackingType: ExerciseTrackingType }` (new).
  The mobile client and the API route import it. No other change; `Exercise`
  is unchanged, so an older app keeps working (spec NFR).

## Data model and migrations

```prisma
model Exercise {
  /// Who set the tracking type (spec 0030): system (default or a sweep) | person (by hand).
  trackingTypeSetBy String @default("system")
}
```

- Migration: `20261018130000_add_exercise_tracking_type_set_by`
  (`ALTER TABLE "Exercise" ADD COLUMN "trackingTypeSetBy" TEXT NOT NULL
  DEFAULT 'system';`).
- Backfill: none. The sweep is the data step, run by the owner.

## API surface (`apps/api`)

- `PUT /exercises/:id/tracking-type` — auth required; body
  `{ trackingType }`; 200 `Exercise`; 400 `Invalid exercise payload`; 401;
  403 `Only the creator can change this exercise`; 404 `Exercise not found`.
- Progress endpoints: same shapes; records of a reclassified exercise come
  from its current type's values.

## Mobile surface (`apps/mobile`)

- `features/exercises/api/exercisesClient.ts`: `setTrackingType`.
- `features/exercises/components/TrackingTypeControl.tsx` (chips).
- `features/exercises/screens/ExerciseDetailScreen.tsx`: the card, the
  confirm sheet, rollback.
- i18n en/es: section title reuse (`customExercise.trackingTitle`), confirm
  title/message/action, error line.
- No native rebuild; Metro reload.

## Testing strategy

| Spec AC / FR | Verified by |
|---|---|
| AC-1, FR-1, FR-2, FR-5 | `planSweep` tests (one row each, totals = catalog size, used changes first); the report mode issues no write (code path) and a local PGlite run with hand-inserted catalog rows compares types before/after. Owner: report on the real catalog. |
| AC-2 | Classifier tests on real catalog names in Spanish, English, German and Italian (planks, holds, hangs, runs, rower, bikes, elliptical, carries, push-ups, sit-ups, pull-ups, dips, loaded crunch, uncertain default). Owner: review of the report. |
| AC-3, FR-7 | `planSweep` on an already-swept catalog → 0 changes; local PGlite: second apply prints 0 changed. |
| AC-4 | Script selects only `source = 'wger'` system rows (code + local PGlite run with a custom "Plank"). |
| AC-5, FR-6, FR-13 | `planSweep` skips `person` rows with the reason; route test sets `person`; local PGlite. |
| AC-6, FR-15..17 | Records projection tests (old "0 kg × 60" plank → no record, volume unchanged); "last time" by construction (`previousSetLabel`). |
| AC-7, FR-18 | By construction (no routine write); noted. |
| AC-8, FR-4, EF-2 | Classifier test (correction wins, reason `owner correction`); `parseCorrections` tests. |
| AC-9, FR-9 | `planUndo` tests (reverts, leaves person-changed); local PGlite undo. |
| EF-1 | `planSweep` lists missing correction/0021 ids. |
| EF-3 | One transaction per apply (code); re-run converges (AC-3). |
| EF-6, FR-12 | Route tests (401/400/403/404/200 and the `person` mark). Detail screen: typecheck; **[DEVICE]** check. |
| EF-7 | `planSweep` flags unilateral rows moving off reps. |
| FR-14 | Mobile: confirm sheet only when the exercise has sessions — **[DEVICE]**. |

## Files to touch

- `packages/domain/src/entities.ts` — `SetExerciseTrackingTypeInput`.
- `apps/api/prisma/schema.prisma`, `apps/api/prisma/migrations/20261018130000_add_exercise_tracking_type_set_by/migration.sql`.
- `apps/api/src/features/exercises/trackingTypeRoutes.ts`, `trackingTypeRepository.ts`, `trackingTypeRoutes.test.ts` (new).
- `apps/api/src/routes/index.ts` — one registration line.
- `apps/api/src/scripts/trackingTypeSweep/{classify,rules,curated,sweep}.ts` (+ `classify.test.ts`, `sweep.test.ts`).
- `apps/api/src/scripts/sweep-tracking-types.ts` (new), `apps/api/src/scripts/set-catalog-tracking-types.ts` (reads `curated.ts`).
- `apps/api/src/scripts/data/tracking-type-corrections.json` (new, `{}`).
- `apps/api/package.json` — three npm scripts.
- `apps/api/src/features/progress/aggregate.ts` (+ `aggregate.test.ts`).
- `apps/mobile/src/features/exercises/{api/exercisesClient.ts,components/TrackingTypeControl.tsx,screens/ExerciseDetailScreen.tsx}`.
- `apps/mobile/src/i18n/locales/{en,es}.ts`.
- `docs/sdd/specs/0030-tracking-type-sweep/*`.

## Risks and open questions

- **Rules judged without the real catalog.** wger is unreachable here; the
  rules are tested on names seen in 0021/0026's exports and common
  vocabulary. The report is the safeguard: every uncertain row is marked, the
  owner corrects through the JSON, re-runs the report, then applies.
- **Translation quality in wger** (wrong or joke translations) can trigger a
  rule; exclusions are checked across every name and the report shows which
  names were read. Corrections fix the rest.
- **Undo needs the run file** written on the machine that applied. Keep
  `apps/api/tmp/` until the sweep is accepted.
- **Catalog shared by everyone** on the server, as in 0022 (spec assumption
  5); revisit with 0015 before distribution.
- **0015 merge.** No edit to `exercises/routes.ts`, `repository.ts` or their
  test; `routes/index.ts` gains one line. If 0015 changes
  `findExerciseById`'s signature, `trackingTypeRepository.ts` follows it.
- **Older apps** ignore the new column; they read `trackingType` as before.

## Rollout

1. Deploy the API: the container applies the migration (additive) and ships
   the endpoint and the records change.
2. From `apps/api` with the server's `.env`: `pnpm run catalog:tracking-sweep`
   → review `tmp/tracking-type-sweep.csv` → corrections in
   `src/scripts/data/tracking-type-corrections.json` → report again →
   `pnpm run catalog:tracking-sweep:apply` → apply again shows `0 changed`.
   Undo: `SWEEP_UNDO=tmp/tracking-type-sweep-runs/<file>.json pnpm run catalog:tracking-sweep:undo`.
3. App: Metro reload; the type control on the detail.

Rollback: undo the run; revert the commits. The column can stay (default
`system`).
