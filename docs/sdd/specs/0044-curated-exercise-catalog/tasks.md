---
spec: 0044
status: in-progress
created: 2026-10-21
---

# Tasks — A curated exercise catalog

| # | Task | Area | Verify | Commit message |
|---|---|---|---|---|
| [ ] 1 | Domain: `ExerciseLoadingKind`, `Exercise.aliases?`, `Exercise.loadingKind?` | domain | typecheck | `feat(domain): exercise aliases and loading kind` |
| [ ] 2 | Migration `add_exercise_catalog_names`; repository maps the new fields; display name by request language (header → stored → es) in exercises, workouts, progress, routines; retired system exercises hidden from the catalog | api | unit tests; migrate on PGlite | `feat(api): exercise names in the app's language` |
| [ ] 3 | Catalog data files + vocabularies + structural test | api (data) | unit test | `feat(catalog): reviewed exercise catalog` (one commit per group) |
| [ ] 4 | Review tables generator → `review/*.md` for the owner | api (script) / docs | run | `docs(sdd): catalog review tables` |
| [ ] 5 | Carry-over proposal script (read-only) → list for the owner | api (script) | run against the server read-only | `feat(catalog): carry-over proposals` |
| [ ] 6 | Apply / undo script `catalog:curate` with report and run file | api (script) | unit tests on the pure planner; dry run on PGlite | `feat(catalog): apply the reviewed catalog` |
| [ ] 7 | Mobile: `Accept-Language`, ranked accent-insensitive search, labels for categories/equipment/muscles | mobile | unit tests | `feat(exercises): search and labels in the app's language` |
| [ ] 8 | **[OWNER]** review the tables and the carry-over list | owner | — | — |
| [ ] 9 | **[DEPLOY]** backup, migration, redeploy, dry run, apply, check AC-1–AC-5 | owner | — | — |

## Progress log

- 2026-10-21 — Spec decisions recorded; plan and tasks self-approved.
