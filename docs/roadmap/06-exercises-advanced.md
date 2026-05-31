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

## Notes
- Catalog screen `apps/mobile/src/features/exercises`. wger has image URLs that
  could be imported later.
