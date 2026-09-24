# 6. Exercises (advanced)

## Checklist
- [x] Filter by category / equipment (chips)
- [ ] Per-exercise history (past sets)
- [x] Favorite exercises (API-backed, star toggle + favorites filter)
- [x] Exercise images / GIFs (wger image URL, shown on detail)
- [x] Pagination of the catalog

## Progress log
- (2026-05-31) Catalog filter chips for category + equipment, derived from the
  loaded catalog (`buildExerciseFacets`) and applied via `filterExercises`
  (pure, unit-tested). Used category/equipment rather than muscle group because
  wger's `primaryMuscleGroups` comes back sparse while category/equipment are
  well populated.
- (2026-05-31) Favorites, API-backed with a star toggle and a favorites filter
  (`22915b3`); load-more pagination of the catalog (`108fb73`); wger image URLs
  imported and shown on the detail screen (`9442567`).

## Notes
- Catalog screen `apps/mobile/src/features/exercises`.
- Per-exercise history is mostly presentation: the data already exists via the
  "last time" endpoint (`GET /workouts/exercises/:id/last`).
