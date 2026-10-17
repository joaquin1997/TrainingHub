---
spec: 0030
status: in-progress  # self-approved under the delegated gates, 2026-10-17
created: 2026-10-17
---

# Tasks — Tracking type sweep of the catalog

Each task leaves the tree green (`pnpm -r typecheck` and `pnpm -r test`).
Order: domain + migration + API → classifier → sweep → script → progress →
mobile → docs. The migration is additive; no native rebuild.

## Task list

| # | Task | Area | Verify | Commit message |
|---|---|---|---|---|
| 1 | [x] Plan and tasks; spec status `in-progress` | docs | — | `docs(sdd): plan and tasks for 0030` |
| 2 | [x] Domain `SetExerciseTrackingTypeInput`; `Exercise.trackingTypeSetBy` + migration `20261018130000_add_exercise_tracking_type_set_by`; `PUT /exercises/:id/tracking-type` (new route/repository files, one line in `routes/index.ts`); route tests | domain, api | tests; `migrate deploy` + `migrate diff` on local PGlite | `feat(exercises): change an exercise's tracking type by hand` |
| 3 | [x] Pure classifier: normalisation, multilingual rules, 0021 list moved to `curated.ts` (old script reads it), corrections first; tests on real catalog names | api | unit tests (AC-2, AC-8) | `feat(exercises): classify catalog exercises into tracking types` |
| 4 | [x] Pure sweep: `parseCorrections`, `planSweep` (rows, totals, used-first order, person skips, EF-7 flags, missing ids), `toCsv`, `planUndo`; tests | api | unit tests (AC-1, AC-3, AC-5, AC-9, EF-1, EF-2, EF-7) | `feat(exercises): plan a tracking type sweep` |
| 5 | [x] Script `sweep-tracking-types.ts` (report / apply / undo), corrections JSON, npm scripts | api | typecheck; run on local PGlite with hand-inserted rows (`SWEEP_WITHOUT_TRANSLATIONS=true`) | `feat(exercises): tracking type sweep with report, apply and undo` |
| 6 | [x] Records use only the values of the exercise's current type | api | aggregate tests (AC-6, FR-17) | `feat(progress): records follow the exercise's current tracking type` |
| 7 | [x] Mobile: `setTrackingType` client, `TrackingTypeControl` on the exercise detail, confirm sheet when the exercise has sessions, rollback; i18n | mobile | typecheck; **[DEVICE]** FR-12, FR-14 | `feat(exercises): change the tracking type from the exercise detail` |
| 8 | [x] Progress log, definition of done | docs | — | `docs(sdd): record 0030 implementation` |
| 9 | [ ] (owner) Deploy the API (migration), run the report, review, correct, apply, re-apply (0 changed) — commands below | ops | — | — |
| 10 | [ ] [DEVICE] Exercise detail: change a catalog type (Mountain climbers → time), the confirm sheet on an exercise with workouts, a custom exercise of someone else shows no control; a plank row after the sweep shows no previous value (AC-5, AC-6, FR-14) | mobile | device | — |

### Owner commands (server) — not run by the agent

After deploying the API (`docker compose up -d --build`; the container runs
`prisma migrate deploy`, which applies
`20261018130000_add_exercise_tracking_type_set_by`), from `apps/api` with the
server's `.env` (`DATABASE_URL`), on a machine that can reach wger.de:

1. Report (no write; FR-5):
   `pnpm run catalog:tracking-sweep`
   → prints totals per type, how many would change, the used exercises that
   would change, unilateral flags (EF-7) and correction ids not found; writes
   `tmp/tracking-type-sweep.csv` (one row per catalog exercise).
2. Review the CSV (start with `certainty = uncertain` and the rows at the
   top: used and changing). For each wrong call add an entry to
   `src/scripts/data/tracking-type-corrections.json`, keyed by `source_id`:
   `{ "1234": { "type": "duration", "name": "Burpees" } }`
   (types: `weight_reps`, `reps`, `duration`, `weight_duration`,
   `distance_duration`). Re-run step 1 until the report is right; commit the
   corrections file so they survive (FR-4).
3. Apply: `pnpm run catalog:tracking-sweep:apply`
   → lists changed (old → new) and skipped (set by a person); keeps a run file
   in `tmp/tracking-type-sweep-runs/`. Run it again: it must say `0 changed`
   (AC-3).
4. Undo a run if needed (AC-9):
   `SWEEP_UNDO=tmp/tracking-type-sweep-runs/<file>.json pnpm run catalog:tracking-sweep:undo`
5. After a future wger import, repeat 1–3 (FR-11).

The 0021 step `pnpm run catalog:tracking-types` is superseded: skip it, or run
it before the sweep (harmless; the sweep re-decides those 44).

### Acceptance criteria → tasks

| AC | Tasks | How |
|---|---|---|
| AC-1 | 4, 5, 9 | `planSweep` tests; local PGlite report; owner report |
| AC-2 | 3, 9 | classifier tests; owner review |
| AC-3 | 4, 5, 9 | sweep test; local second apply; owner |
| AC-4 | 5 | script selects wger system rows only; local PGlite with a custom "Plank" |
| AC-5 | 2, 4, 10 | route test (`person`), sweep skip test; device |
| AC-6 | 6, 10 | records projection tests; device |
| AC-7 | — | by construction: the sweep never writes routines |
| AC-8 | 3 | classifier test |
| AC-9 | 4, 5 | `planUndo` tests; local undo |

## Progress log

- 2026-10-17 — Plan and tasks written and self-approved under the owner's
  delegation.
- 2026-10-17 — Task 2. Migration
  `20261018130000_add_exercise_tracking_type_set_by` written by hand; on a
  fresh local PGlite `prisma migrate deploy` applied every migration and
  `prisma migrate diff --from-url … --to-schema-datamodel` reported "No
  difference detected". `PUT /exercises/:id/tracking-type` lives in new
  files (`trackingTypeRoutes.ts`, `trackingTypeRepository.ts`) registered
  from `routes/index.ts`, so `exercises/routes.ts`, `repository.ts` and their
  test (0015's area) are untouched.
- 2026-10-17 — Task 3. Classifier and rules in
  `apps/api/src/scripts/trackingTypeSweep/`; 0021's list moved to
  `curated.ts` (the 0021 script reads it from there and now also skips
  types set by a person). 89 tests on real catalog names in Spanish, English,
  German and Italian, including loaded look-alikes (cable crunch, barbell
  row, leg curl "flexión de piernas", hang clean, suitcase deadlift) that must
  stay weight & reps. The rules alone reach the same type as the 0021 list on
  all 44 of its names. Not checked against the full catalog: wger is not
  reachable from the sandbox — that is the owner's report (task 9).
- 2026-10-17 — Task 4. `sweep.ts`: report rows (every exercise once,
  totals = catalog size, used changes first), person-set skips, EF-7 flags,
  missing override ids, corrections parsing with an error per bad entry, CSV,
  run log and undo plan; 15 tests.
- 2026-10-17 — Task 5. `sweep-tracking-types.ts` + npm scripts
  `catalog:tracking-sweep`, `:apply`, `:undo`; corrections file with a
  `_readme` note only. Local PGlite (all migrations, 10 wger rows + a custom
  "Plank", "Mountain climbers" set to time by a person), with
  `SWEEP_WITHOUT_TRANSLATIONS=true` (wger unreachable): report → 10 rows,
  7 would change, Mountain climbers skipped (set by a person), the unilateral
  isometric squat flagged (EF-7), the 0021 ids absent listed (EF-1), no
  write; apply → 7 changed with a run file; apply again → "0 changed"
  (AC-3); Burpees then set by a person, undo → 6 reverted, Burpees left
  (AC-9); a correction with type `weight_distance` stopped the apply before
  any write, naming the entry (EF-2); a correction Burpees → time reported
  with reason "owner correction" (AC-8); the custom "Plank" stayed
  weight & reps throughout (AC-4). Note: PGlite's socket server needs
  `pgbouncer=true` in the local `DATABASE_URL` (prepared statements); not
  needed on the real server.
- 2026-10-17 — Task 6. `recordValuesOf` in `progress/aggregate.ts` reduces
  each working set to its exercise's current type before records are
  derived; points, volume and history keep the logged values. Tests in
  `progress/reclassified.test.ts` (old "0 kg × 60" plank → only the 45 s
  record, no session record, volume unchanged); every earlier progress test
  unchanged and green. "Last time" needed no change: the set row prints only
  the current type's fields and `–` when none was logged (FR-17).
- 2026-10-17 — Task 7. `TrackingTypeControl` (the five chips of the create
  form) in a card on the exercise detail, shown to whoever may change the
  exercise (catalog: anyone signed in; custom: its creator). With recent
  sessions on screen, an `ActionSheet` explains first that past workouts keep
  what was logged and "last time"/records use the new type (FR-14); the change
  is optimistic with rollback and an error line, like the unilateral switch.
  End-to-end against the built API on the same PGlite (two registered users):
  no token 401, `weight_distance` 400, catalog "Plancha lateral" → reps by
  any user 200 with `trackingTypeSetBy = person`, someone else's custom
  exercise 403, its creator 200, unknown id 404; the next sweep apply listed
  "Plancha lateral" as skipped, set by a person (AC-5). Not checked: the
  screen itself (no web preview this time) — [DEVICE] task 10.
- 2026-10-17 — Task 8. Code complete; left for the owner: the migration on
  deploy, the report/review/apply on the server (task 9, commands above) and
  the device check (task 10). Backlog row and roadmap 06 are the
  coordinator's. Files shared with parallel work: `apps/api/src/routes/index.ts`
  (one line), `apps/api/prisma/schema.prisma` (one column on `Exercise`),
  `packages/domain/src/entities.ts` (one interface),
  `apps/mobile/src/features/exercises/screens/ExerciseDetailScreen.tsx`,
  `apps/mobile/src/i18n/locales/{en,es}.ts` (`customExercise` block) and
  `apps/api/src/features/progress/aggregate.ts` (`buildRecordHistories`).

## Definition of done

- [x] Every functional requirement and acceptance criterion met or deferred
      (AC-1/AC-2 on the real catalog wait for the owner's report; FR-14 and
      the detail control wait for the device check; AC-7 by construction)
- [x] `pnpm -r typecheck` and `pnpm -r test` green
- [ ] Migration deployed; sweep reported, reviewed and applied on the server (owner)
- [ ] Device check of the detail control (owner)
- [ ] Roadmap 06 and backlog updated (coordinator)
