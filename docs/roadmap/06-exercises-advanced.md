# 6. Exercises (advanced)

## Checklist
- [x] Filter by category / equipment (chips)
- [ ] Per-exercise history (past sets)
- [x] Favorite exercises (API-backed, star toggle + favorites filter)
- [x] Exercise images / GIFs (wger image URL, shown on detail)
  - [x] More catalog images matched from free-exercise-db; own photo for a
    custom exercise; thumbnails in lists and the workout (spec 0026 —
    server script and device check pending)
- [x] Pagination of the catalog (client-side: the API returns the full catalog)
- [x] Create a custom exercise from the Exercises tab and every picker;
  replace an exercise in the active workout and the routine editor (spec 0020)

## Progress log
- (2026-05-31) Catalog filter chips for category + equipment, derived from the
  loaded catalog (`buildExerciseFacets`) and applied via `filterExercises`
  (pure, unit-tested). Used category/equipment rather than muscle group because
  wger's `primaryMuscleGroups` comes back sparse while category/equipment are
  well populated.
- (2026-05-31) Favorites, API-backed with a star toggle and a favorites filter
  (`22915b3`); client-side load-more pagination of the catalog (`108fb73`; the list endpoint
  is not paginated); wger image URLs
  imported and shown on the detail screen (`9442567`).
- (2026-10-17) Spec 0020 — create and replace exercises where they are
  needed. The custom exercise form is shared (`CustomExerciseForm`); the
  Exercises tab has a "New exercise" action prefilled with the search, and
  every exercise picker shows `Create "<text>"` under the search and creates
  inline, choosing the new exercise. "Replace" (⇄) on each active workout
  card swaps the exercise keeping its sets and superset position; when sets
  are already done the picker asks to keep them (the old exercise stays with
  its done sets) or drop them. The routine editor replaces a row keeping its
  order, rest, superset and targets. Mobile only, no rebuild; the picker
  steps on iOS are a pending device check.
- (2026-10-17) Spec 0026 — exercise images. A script matches the catalog to
  free-exercise-db by exact name (Spanish name or any wger translation) plus
  a hand-reviewed alias file; it only fills empty images, writes a CSV report
  (dry run by default) and is idempotent. Locally it took coverage to about
  36 % (332/932). Custom exercises get an own photo: new `ExercisePhoto`
  table, `PUT/GET/DELETE /exercises/:id/photo` (JPEG, creator only, private
  cache), library picker and resizer reused from 0027, no new dependency.
  Images load with auth and fall back to the tile on error; a thumb shows in
  the active workout card. Needs the `add_exercise_photo` migration
  (redeploy), then `pnpm run import:images` (review the CSV) and
  `pnpm run import:images:db` on the server, and a device rebuild (image
  picker, shared with 0027).

## Notes
- Catalog screen `apps/mobile/src/features/exercises`.
- Per-exercise history is mostly presentation: the data already exists via the
  "last time" endpoint (`GET /workouts/exercises/:id/last`).
