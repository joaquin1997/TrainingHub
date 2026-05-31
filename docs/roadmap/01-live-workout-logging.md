# 1. Live workout logging

Make the in-progress workout behave like Hevy: edit sets/exercises live, see
previous performance, set types, and persist completion.

## Checklist
- [x] Persist per-set completion (`completedAt`) + `isWarmup` in the API
- [x] Add / remove sets during a workout
- [x] Add / remove exercises during a workout
- [x] Reorder exercises and sets (up/down)
- [x] Show "last time" per set (e.g. 60 kg × 8 from the previous workout)
- [x] Set types (warmup / drop / failure) — UI + persistence
- [x] Ghosted previous/target values as input placeholders (Hevy-style): unedited
  sets still log their default; edited values switch to normal text

## Design notes
- Source of truth for the live session is the mobile `workoutDraftStore`
  (`activeWorkout`). Draft set = `WorkoutSetDraft` (reps/weightKg strings, `done`).
- The API `WorkoutSet` table already has `isWarmup`, `completedAt`, `durationSeconds`,
  `distanceMeters` columns — completion just needs wiring through the write DTO.
- "Last time": new API endpoint returning the most recent logged sets for an
  exercise (dev user), consumed when building/showing the active workout.
- Set types beyond warmup (drop/failure) need a `type` column on `WorkoutSet`
  (additive migration) + a field on the write DTO; warmup maps to `isWarmup`.
- Reorder: up/down buttons (drag&drop is deferred — heavier, needs a gesture lib).

## Progress log
- All sub-points landed (2026-05-30). Persisted completion + set types via an
  additive migration; live add/remove/reorder of sets & exercises; "last time"
  per set via GET /workouts/exercises/:id/last. **Point 1 complete.**
- (2026-05-31) Hevy-style placeholders: each set ghosts its previous/target
  values (`repsPlaceholder`/`weightPlaceholder`) as translucent input
  placeholders. Empty fields fall back to the placeholder on save
  (`effectiveSetValue`), so an unedited set logs its default; typing switches the
  field to normal text. New `applyLastPerformance` seeds placeholders from the
  last-performance fetch.
