---
spec: 0044
status: in-progress
created: 2026-10-21
---

# Tasks — A curated exercise catalog

| # | Task | Area | Verify | Commit message |
|---|---|---|---|---|
| [x] 1 | Domain: `ExerciseLoadingKind`, `Exercise.aliases?`, `Exercise.loadingKind?` | domain | typecheck | `feat(domain): exercise aliases and loading kind` |
| [x] 2 | Migration `add_exercise_catalog_names`; repository maps the new fields; display name by request language (header → stored → es) in exercises, workouts, progress, routines; retired system exercises hidden from the catalog | api | unit tests; migrate on PGlite | `feat(api): exercise names in the app's language` |
| [x] 3 | Catalog data files + vocabularies + structural test | api (data) | unit test | `feat(catalog): reviewed exercise catalog` (one commit per group) |
| [x] 4 | Review tables generator → `review/*.md` for the owner | api (script) / docs | run | `docs(sdd): catalog review tables` |
| [x] 5 | Carry-over proposal script (read-only) → list for the owner | api (script) | run against the server read-only | `feat(catalog): carry-over proposals` |
| [x] 6 | Apply / undo script `catalog:curate` with report and run file | api (script) | unit tests on the pure planner; dry run on PGlite | `feat(catalog): apply the reviewed catalog` |
| [x] 7 | Mobile: `Accept-Language`, ranked accent-insensitive search, labels for categories/equipment/muscles | mobile | unit tests | `feat(exercises): search and labels in the app's language` |
| [ ] 8 | **[OWNER]** review the tables and the carry-over list | owner | — | — |
| [ ] 9 | **[DEPLOY]** backup, migration, redeploy, dry run, apply, check AC-1–AC-5 | owner | — | — |

## Owner steps (tasks 8–9)

1. **Review** `review/*.md` (8 groups, 195 exercises) and `review/carry-over.md`
   (54 old exercises in use → reviewed one). Say what is wrong; the assistant
   fixes the data files and regenerates the tables (`npm run catalog:review`).
2. **Backup** the server database (`pg_dump`, as in `~/backups/traininghub/`).
3. **Migrate and redeploy** the API (`add_exercise_catalog_names`). Harmless
   on its own: nothing is retired until step 5.
4. **Report**, through the SSH tunnel, from `apps/api`:
   `npm run catalog:curate` — read it; nothing changes.
5. **Apply**: `npm run catalog:curate:apply`. Keep the run file printed
   (`tmp/catalog-curate-runs/…json`) — it is the only way to undo:
   `CURATE_UNDO=<file> npm run catalog:curate:undo`.
6. Run the apply once more after a few days: it carries over anything a
   phone saved against a retired exercise in the meantime (EF-2), and says
   `0 changed` otherwise.
7. Reload the app (Metro, no rebuild) for search and labels; check AC-1–AC-5.

## Progress log

- 2026-10-21 — Spec decisions recorded; plan and tasks self-approved.
- 2026-10-21 — Tasks 1–7 landed on `feat/sdd-0040-device-fixes`. The catalog
  has 195 exercises (fewer than the 250–350 assumed: the common gym lifts,
  machines, cables, core and cardio; more can be added the same way). 185
  have a free-exercise-db picture, all checked to exist. The carry-over list
  was produced read-only from the server: 54 old exercises in use, 52 with a
  proposal after a review pass (added bird dog, split squat, band external
  rotation, incline Y-T raise; fixed plural matching). The language is held
  per request (`infrastructure/requestLanguage.ts`) rather than threaded
  through every repository. Rehearsed on a local PGlite with every migration
  (`migrate diff` empty): report → apply → second apply `0 changed` → undo
  restores the seed exactly → apply again; `GET /exercises` answers 195
  exercises, `Bench press` with `Accept-Language: en`, `Press de banca`
  otherwise, retired ones hidden. Note: PGlite socket 0.2.x breaks Prisma
  writes; 0.1.6 with PGlite 0.4 works. Not checked on the web preview.
- 2026-10-21 — First apply on the server by the owner (195 created, 847
  retired, 14 own exercises merged). Then, at the owner's request ("vamos con
  los 750 de free-exercise-db"), 568 more from free-exercise-db: every entry
  that is not a stretch, not already used as a picture and not the same name
  as an existing one. Fields filled from the dataset (muscles, equipment,
  category; loading kind, tracking type and unilateral by rule), Spanish names
  written by hand, 44 rule misses corrected (rings, TRX, chin-ups, jumps and
  sprints record reps; drag curl is not a carry). New equipment value
  `Other`. 763 in total, 753 with a picture; files `data/catalog/fedb-*.json`,
  review tables `review/fedb-*.md`. Apply transaction timeout raised to 10
  minutes for the 568 creates through the tunnel.
