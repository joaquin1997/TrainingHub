---
spec: 0044
status: approved     # self-approved under the delegated gates, 2026-10-21
created: 2026-10-21
---

# Plan — A curated exercise catalog

## Constitution check

| Article | Engaged? | Compliance |
|---|---|---|
| 1 — Scope control | yes | A reviewed data file, one additive migration, a language-aware name on read, an apply/undo script, search and labels on mobile. No in-app review or merge screen, no instructions/videos, no per-person catalog values, no changes to progress screens beyond the name they already show. |
| 2 — Template vs performed | yes | The script re-points `WorkoutExercise.exerciseId` and `RoutineExercise.exerciseId` (data only, both sides untouched otherwise); a routine's snapshot name is updated, a workout has none. No type is shared. |
| 3 — Shared domain types | yes | `Exercise.aliases?`, `Exercise.loadingKind?` and `ExerciseLoadingKind` in `packages/domain`. Optional, so older clients ignore them (EF-1). |
| 4 — Weight in kg | no | No weight is read or written. |
| 5 — Prisma migrations | yes | One additive migration `add_exercise_catalog_names` (`nameEs`, `nameEn`, `aliases`, `loadingKind`). Everything else — upserting the reviewed exercises, new muscle groups, re-pointing, retiring — is **data**: a script under `apps/api/src/scripts/`, dry run by default, run file for undo (as 0030). |
| 6 — Integrations behind interfaces | no | free-exercise-db is only a source for authoring and image URLs (as 0026); nothing runs against it at request time. |
| 7 — Secrets | no | The script reads `DATABASE_URL` from the owner's `.env`. |
| 8 — Committable + verified | yes | One commit per task; `pnpm -r typecheck` + `pnpm -r test` green. The catalog file has a structural test. |
| 9 — Dependencies | no | None; no native rebuild. |
| 10 — TODOs over half-solutions | yes | The catalog content can only be judged by the owner: review tables per group are generated, and the apply waits for his OK. |

## Current state (verified 2026-10-21)

- `Exercise.name` is the only name; `@@unique([source, sourceId])`; wger
  rows are `source = 'wger'`, custom `source = 'custom'`.
- Names reach the app through: the exercises list/detail (`mapExercise`),
  saved workouts (`workouts/repository.ts`, join), progress
  (`progress/repository.ts`, join) and routines (`RoutineExercise.exerciseName`,
  a **snapshot** written on save).
- `visibleExerciseWhere` shows every system exercise; `usableExerciseWhere`
  accepts every system exercise, deleted or not — so a retired one still
  saves from an active workout (EF-2) once visibility hides it.
- Mobile shows `category`, `equipment` and muscle names raw (English wger
  labels); search is `name.toLowerCase().includes(query)`.
- free-exercise-db: Unlicense, 876 entries with `equipment` (barbell,
  dumbbell, cable, machine, kettlebells, e-z curl bar, body only…), primary and
  secondary muscles and images; already used for image URLs (0026).

## Approach

1. **The reviewed catalog is a data file** in the repo
   (`apps/api/src/scripts/data/catalog/*.json`, one file per group), written
   by the assistant from common gym practice with free-exercise-db as the
   reference for muscles and pictures, then reviewed by the owner through
   generated tables. Each entry:
   `{ slug, es, en, aliases[], category, primary[], secondary[], equipment[], loadingKind?, trackingType, unilateral, image? }`.
   Closed vocabularies are enforced by a unit test (no duplicate slug or
   name in either language, every value in its vocabulary, weight-tracking
   entries have a loading kind, others none).
2. **Names per language live on the exercise** (`nameEs`, `nameEn`,
   `aliases`). `name` stays as today (the Spanish name for reviewed ones) for
   anything that reads it raw. The API picks the display name per request:
   `Accept-Language` (es/en) sent by the app → else the user's stored language
   → else Spanish. Applied in `mapExercise`, the workout and progress joins,
   and routine reads (reviewed exercise → its localized name; otherwise the
   snapshot).
3. **Apply script** `catalog:curate` (dry run by default, `CURATE_APPLY=true`,
   `CURATE_MODE=undo`): upserts reviewed exercises by `(source='curated',
   sourceId=slug)`, adds missing muscle groups, re-points the rows listed in
   the **carry-over map** (`catalog-carry-over.json`: old publicId → slug, for
   both wger and the owner's custom duplicates), moves favourites (dropping a
   duplicate), marks every wger exercise and every merged custom one
   `deletedAt` (retired), and writes a run file with the previous state of
   every row it touched. Re-running changes nothing; it also picks up rows
   saved later against a retired exercise (EF-2).
4. **Carry-over proposals**: a read-only script lists every old exercise
   that a workout, routine or favourite uses, with the best reviewed match
   by normalised name/alias and a confidence; the owner confirms the list,
   which becomes the committed map (EF-3: unconfirmed ones stay retired by
   name, never guessed).
5. **Mobile**: sends `Accept-Language`; search over name + aliases,
   case- and accent-insensitive, ranked (name starts with query → word in
   name starts with query → alias match; then shorter name first); labels for
   categories, equipment and muscles from i18n with the raw value as
   fallback.

### Alternatives considered

- **Translate and clean the wger rows in place** — rejected by the owner's
  decision; also most rows would need several fixes each, and the basic lifts
  are missing anyway.
- **Import free-exercise-db as is** — rejected: English only, names like
  "Barbell Bench Press - Medium Grip", 123 stretches, and its own errors; it
  is a reference, not the catalog.
- **Names translated on the device** (a map in the app) — rejected: every
  screen that shows a name from the API (history, progress, routines) would
  need it; one place on the server covers all, and old apps get the right
  language through the stored setting.
- **A link table "replaced by" instead of re-pointing** — rejected: every
  query of history, records and progress would have to follow it; re-pointing
  makes the carried-over history the reviewed exercise's by construction, and
  the run file keeps it reversible.
- **A local LLM to fix the rows** — discussed with the owner: worse quality
  than drafting here, and the work is a one-off.

## Shared contracts (`packages/domain`)

- `export type ExerciseLoadingKind = 'barbell' | 'dumbbell' | 'machine';`
- `Exercise.aliases?: string[]` — other names to search by, both languages.
- `Exercise.loadingKind?: ExerciseLoadingKind` — read by 0043 later.

## Data model and migrations

- `Exercise.nameEs String?`, `nameEn String?`, `aliases String[] @default([])`,
  `loadingKind String?`.
- Migration `20261021120000_add_exercise_catalog_names`, additive, no
  backfill.
- Data: by the apply script only.

## API surface

- No new endpoint. `GET /exercises`, `GET /exercises/:id`, workouts,
  routines and progress responses carry the localized name and, on
  exercises, `aliases` and `loadingKind`.
- `visibleExerciseWhere`: system exercises only when `deletedAt` is null.

## Mobile surface

- `lib/http.ts`: `Accept-Language` header from i18n.
- `features/exercises/utils/exerciseFilters.ts`: normalised, ranked search.
- Labels: `features/exercises/utils/catalogLabels.ts` + i18n keys for
  categories, equipment and muscles; used by the list chips, the detail and
  the custom-exercise form.

## Risks

- **Content quality** is the whole feature: mitigated by owner review per
  group before apply.
- **Undo needs the run file** kept on the owner's machine (as 0030).
- **Old builds** show `name` (Spanish for reviewed ones) and, for the catalog
  list, the server-localized name from the stored language — never blank.
